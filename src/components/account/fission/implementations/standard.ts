import * as Fission from "../../../../common/fission.js"
import * as Ucan from "../../../../ucan/ts-ucan/index.js"
import * as Identifier from "../../../identifier/implementation.js"
import * as Common from "./common.js"

import { Names } from "../../../../repositories/names.js"
import { Ticket } from "../../../../ticket/types.js"
import { Implementation } from "../../implementation.js"
import { isUsernameAvailable, isUsernameValid } from "../index.js"
import { Dependencies } from "./common.js"

////////
// 🧩 //
////////

export type Annex = Common.Annex & {
  requestVerificationCode: (
    formValues: Record<string, string>
  ) => Promise<{ requested: true } | { requested: false; reason: string }>
}

//////////////
// CREATION //
//////////////

export async function requestVerificationCode<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  formValues: Record<string, string>
): Promise<{ requested: true } | { requested: false; reason: string }> {
  let email = formValues.email

  if (!email) {
    return {
      requested: false,
      reason: `Email is missing from the form values record`,
    }
  }

  email = email.trim()
  const identifierDID = dependencies.identifier.did()

  const ucan = await Ucan.build({
    audience: await Fission.did(endpoints, dependencies.dns),
    issuer: {
      did: () => identifierDID,
      jwtAlg: await dependencies.identifier.ucanAlgorithm(),
      sign: data => dependencies.identifier.sign(data),
    },
    facts: [],
    proofs: [],
  })

  const response = await fetch(
    Fission.apiUrl(endpoints, "/auth/email/verify"),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${Ucan.encode(ucan)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(formValues),
    }
  )

  // The server
  return response.ok
    ? { requested: true }
    : { requested: false, reason: `Server error: ${response.statusText}` }
}

export async function canRegister<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  formValues: Record<string, string>
): Promise<{ canRegister: true } | { canRegister: false; reason: string }> {
  if (typeof formValues.accountType !== "string") {
    return {
      canRegister: false,
      reason: "An `accountType` form value is required, this can either be `app` or `verified`",
    }
  }

  // No validation needed for app accounts
  if (formValues.accountType === "app") {
    return {
      canRegister: true,
    }
  }

  // Verified accounts
  let username = formValues.username?.trim()
  if (!username) {
    return {
      canRegister: false,
      reason: `Username is missing from the form values record`,
    }
  }

  if (isUsernameValid(username) === false) {
    return {
      canRegister: false,
      reason: "Username is not valid.",
    }
  }

  if (
    (await isUsernameAvailable(
      endpoints,
      dependencies.dns,
      username
    )) === false
  ) {
    return {
      canRegister: false,
      reason: "Username is not available.",
    }
  }

  const email = formValues.email?.trim()
  if (!email) {
    return {
      canRegister: false,
      reason: `Email is missing from the form values record`,
    }
  }

  const code = formValues.code?.trim()
  if (!code) {
    return {
      canRegister: false,
      reason: `Verification code is missing from the form values record`,
    }
  }

  return {
    canRegister: true,
  }
}

export async function register<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  names: Names,
  formValues: Record<string, string>
): Promise<
  | { registered: true; tickets: Ticket[] }
  | { registered: false; reason: string }
> {
  const form = await canRegister(endpoints, dependencies, formValues)
  if (!form.canRegister) {
    return {
      registered: false,
      reason: form.reason,
    }
  }

  if (formValues.accountType === "app") {
    return registerAppAccount(endpoints, dependencies, identifier, names, formValues)
  } else if (formValues.accountType === "verified") {
    return registerVerifiedAccount(endpoints, dependencies, identifier, names, formValues)
  } else {
    throw new Error("Invalid account type")
  }
}

async function registerAppAccount<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  names: Names,
  formValues: Record<string, string>
): Promise<
  | { registered: true; tickets: Ticket[] }
  | { registered: false; reason: string }
> {
  throw new Error("Not implemented yet")
}

async function registerVerifiedAccount<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  names: Names,
  formValues: Record<string, string>
): Promise<
  | { registered: true; tickets: Ticket[] }
  | { registered: false; reason: string }
> {
  const code = formValues.code.trim()
  const identifierDID = dependencies.identifier.did()

  const token = Ucan.encode(
    await Ucan.build({
      audience: await Fission.did(endpoints, dependencies.dns),
      issuer: {
        did: () => identifierDID,
        jwtAlg: await dependencies.identifier.ucanAlgorithm(),
        sign: data => dependencies.identifier.sign(data),
      },
      proofs: [],
      facts: [{ code }],
    })
  )

  const response = await fetch(Fission.apiUrl(endpoints, "/account"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(formValues),
  })

  if (response.status < 300) {
    const obj = await response.json()
    const ucan = Ucan.decode(obj.ucan)

    return {
      registered: true,
      tickets: [Ucan.toTicket(ucan)],
    }
  }

  const error = await response
    .json()
    .then(j => j["errors"][0]["detail"])
    .catch(() => response.statusText)

  return {
    registered: false,
    reason: `Server error: ${error}`,
  }
}

////////
// 🛳 //
////////

export function implementation<FS>(
  dependencies: Dependencies<FS>,
  optionalEndpoints?: Fission.Endpoints
): Implementation<Annex> {
  const endpoints = optionalEndpoints || Fission.PRODUCTION

  return {
    annex: (identifier, inventory, names) => ({
      requestVerificationCode: (...args) => requestVerificationCode(endpoints, dependencies, ...args),
      volume: (...args) => Common.volume(endpoints, dependencies, identifier, inventory, names, ...args),
    }),

    canRegister: (...args) => canRegister(endpoints, dependencies, ...args),
    register: (...args) => register(endpoints, dependencies, ...args),

    did: (...args) => Common.did(dependencies, ...args),
    hasSufficientAuthority: (...args) => Common.hasSufficientAuthority(dependencies, ...args),
    provideAuthority: Common.provideAuthority,
  }
}
