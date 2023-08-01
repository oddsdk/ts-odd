import * as AgentDID from "../../agent/did.js"
import * as Fission from "../../common/fission.js"
import * as Ucan from "../../ucan/index.js"
import * as Identifier from "../identifier/implementation.js"

import { AccountQuery } from "../../authority/query.js"
import { CID } from "../../common/index.js"
import { Agent, DNS, Manners } from "../../components.js"
import { FileSystem } from "../../fs/class.js"
import { DELEGATE_ALL_PROOFS } from "../../ucan/capabilities.js"
import { Dictionary } from "../../ucan/dictionary.js"
import { DataRoot, isUsernameAvailable, isUsernameValid } from "./fission/index.js"
import { Implementation } from "./implementation.js"

////////
// 🧩 //
////////

export type Annex = {
  requestVerificationCode: (
    formValues: Record<string, string>
  ) => Promise<{ requested: true } | { requested: false; reason: string }>

  /**
   * Create a progressive volume for a Fission account.
   *
   * This method can be used to load a local-only file system before an account is registered.
   * When you register an account, the file system will sync with the Fission server, making it available through Fission IPFS nodes.
   */
  volume: () => Promise<{ // TODO: Allow passing in username to look up data roots of other Fission users
    dataRoot?: CID
    dataRootUpdater: (
      dataRoot: CID,
      proofs: Ucan.Ucan[]
    ) => Promise<{ updated: true } | { updated: false; reason: string }>
    did: string
  }>
}

export type Dependencies = {
  agent: Agent.Implementation
  dns: DNS.Implementation
  manners: Manners.Implementation<FileSystem>
}

//////////////
// CREATION //
//////////////

export async function requestVerificationCode(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  formValues: Record<string, string>
): Promise<{ requested: true } | { requested: false; reason: string }> {
  let email = formValues.email

  if (!email) {
    return {
      requested: false,
      reason: `Email is missing from the form values record. It has the following keys: ${
        Object.keys(
          formValues
        ).join(", ")
      }.`,
    }
  }

  email = email.trim()

  const rawtoken = await Ucan.build({
    audience: await Fission.did(endpoints, dependencies.dns),
    issuer: await Ucan.keyPair(dependencies.agent),
    capabilities: [DELEGATE_ALL_PROOFS], // FIXME this is incorrect.
    facts: [{ placeholder: "none" }], // For rs-ucan compat (obsolete, but req'd for 0.2.x)
    proofs: [], // rs-ucan compat
  })

  const token = Ucan.encode(rawtoken)

  // formValues.did = await dependencies.agent.did()

  const response = await fetch(
    Fission.apiUrl(endpoints, "/auth/email/verify"),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
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

export async function canRegister(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  formValues: Record<string, string>
): Promise<{ canRegister: true } | { canRegister: false; reason: string }> {
  let username = formValues.username

  if (!username) {
    return {
      canRegister: false,
      reason: `Username is missing from the form values record. It has the following keys: ${
        Object.keys(
          formValues
        ).join(", ")
      }.`,
    }
  }

  username = username.trim()

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

  return {
    canRegister: true,
  }
}

export async function register(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  formValues: Record<string, string>,
  identifierUcan: Ucan.Ucan
): Promise<
  | { registered: true; ucans: Ucan.Ucan[] }
  | { registered: false; reason: string }
> {
  const email = formValues.email
  if (!email) {
    return {
      registered: false,
      reason: `Email is missing from the form values record. It has the following keys: ${
        Object.keys(
          formValues
        ).join(", ")
      }.`,
    }
  }

  const username = formValues.username
  if (!username) {
    return {
      registered: false,
      reason: `Username is missing from the form values record. It has the following keys: ${
        Object.keys(
          formValues
        ).join(", ")
      }.`,
    }
  }

  const code = formValues.code
  if (!code) {
    return {
      registered: false,
      reason: `Verification code is missing from the form values record. It has the following keys: ${
        Object.keys(
          formValues
        ).join(", ")
      }.`,
    }
  }

  const token = Ucan.encode(
    await Ucan.build({
      audience: await Fission.did(endpoints, dependencies.dns),
      issuer: await Ucan.keyPair(dependencies.agent),
      capabilities: [DELEGATE_ALL_PROOFS], // FIXME this is incorrect
      proofs: [Ucan.encode(identifierUcan)],
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
    return {
      registered: true,
      ucans: [
        // TODO: This should be done by the server
        await Ucan.build({
          audience: identifierUcan.payload.iss,
          issuer: await Ucan.keyPair(dependencies.agent),
          proofs: [Ucan.encode(identifierUcan)],

          facts: [{ username }],
        }),
      ],
      // TODO: We need some UCANs here. We should get capabilities from the Fission server.
    }
  }

  return {
    registered: false,
    reason: `Server error: ${response.statusText}`,
  }
}

///////////////
// DATA ROOT //
///////////////

export async function volume(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  identifier: Identifier.Implementation,
  ucanDictionary: Dictionary
): Promise<{
  dataRoot?: CID
  dataRootUpdater: (
    dataRoot: CID,
    proofs: Ucan.Ucan[]
  ) => Promise<{ updated: true } | { updated: false; reason: string }>
  did: string
}> {
  const dataRootUpdater = async (dataRoot: CID, proofs: Ucan.Ucan[]) => {
    const { suffices } = await hasSufficientAuthority(identifier, ucanDictionary)
    if (!suffices) return { updated: false, reason: "Not authenticated yet, lacking authority." }
    return updateDataRoot(endpoints, dependencies, identifier, ucanDictionary, dataRoot, proofs)
  }

  const { suffices } = await hasSufficientAuthority(identifier, ucanDictionary)

  if (!suffices) {
    return {
      dataRoot: undefined,
      dataRootUpdater,
      did: await identifier.did(),
    }
  }

  if (!navigator.onLine) {
    return {
      dataRoot: undefined,
      dataRootUpdater,
      did: await did(identifier, ucanDictionary),
    }
  }

  const identifierUcans = ucanDictionary.lookupByAudience(
    await identifier.did()
  )

  const facts = identifierUcans.reduce(
    (acc: Record<string, unknown>, ucan) => ({
      ...acc,
      ...ucanDictionary.listFacts(ucan),
    }),
    {}
  )

  const username = facts["username"]
  if (!username) {
    throw new Error(
      "Expected a username to be found in the facts of the delegation chains of the given identifier UCANs"
    )
  }
  if (typeof username !== "string") {
    throw new Error("Expected username to be a string, but it isn't.")
  }

  return {
    dataRoot: (await DataRoot.lookup(endpoints, dependencies, username)) || undefined,
    dataRootUpdater,
    did: await did(identifier, ucanDictionary),
  }
}

export async function updateDataRoot(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies,
  identifier: Identifier.Implementation,
  ucanDictionary: Dictionary,
  dataRoot: CID,
  proofs: Ucan.Ucan[]
): Promise<{ updated: true } | { updated: false; reason: string }> {
  if (!navigator.onLine) return { updated: false, reason: "NO_INTERNET_CONNECTION" }

  const ucan = await Ucan.build({
    // Delegate to self
    audience: await AgentDID.signing(dependencies.agent),
    issuer: await Ucan.keyPair(dependencies.agent),

    capabilities: [DELEGATE_ALL_PROOFS],
    proofs: await Promise.all(
      proofs.map((prf) => Ucan.cid(prf).then((c) => c.toString()))
    ),
  })

  return DataRoot.update(endpoints, dependencies, dataRoot, ucan)
}

////////////////////////////
// IDENTIFIER & AUTHORITY //
////////////////////////////

export async function did(
  identifier: Identifier.Implementation,
  ucanDictionary: Dictionary
): Promise<string> {
  const identifierUcans = ucanDictionary.lookupByAudience(
    await identifier.did()
  )

  const rootIssuers: Set<string> = identifierUcans.reduce(
    (set: Set<string>, identifierUcan): Set<string> => {
      const iss = ucanDictionary.rootIssuer(identifierUcan)
      return set.add(iss)
    },
    new Set() as Set<string>
  )

  if (rootIssuers.size > 1) {
    console.warn(
      "Encounter more than one root issuer in the identifier UCANs set. This should ideally not happen. Using the first one in the set."
    )
  }

  const root = Array.from(rootIssuers.values())[0]
  if (!root) throw new Error("Expected a root issuer to be found")
  return root

  // TODO: Get public key from fission server generated key pair
  //       -> issuer from fission-server issued UCAN
}

export async function hasSufficientAuthority(
  identifier: Identifier.Implementation,
  ucanDictionary: Dictionary
): Promise<
  { suffices: true } | { suffices: false; reason: string }
> {
  const identifierUcans = ucanDictionary.lookupByAudience(
    await identifier.did()
  )

  const facts = identifierUcans.map(
    ucan => ucanDictionary.listFacts(ucan)
  )

  // TODO: Check if we have all our needed capabilities.
  const suffices = facts.some((f) => !!f["username"])
  return suffices ? { suffices } : { suffices, reason: "Missing the needed capabilities" }
}

export async function provideAuthority(accountQuery: AccountQuery): Promise<Ucan.Ucan[]> {
  return [] // TODO
}

////////
// 🛳 //
////////

export function implementation(
  dependencies: Dependencies,
  optionalEndpoints?: Fission.Endpoints
): Implementation<Annex> {
  const endpoints = optionalEndpoints || Fission.PRODUCTION

  return {
    annex: (identifier, ucanDictionary) => ({
      requestVerificationCode: (...args) => requestVerificationCode(endpoints, dependencies, ...args),
      volume: (...args) => volume(endpoints, dependencies, identifier, ucanDictionary, ...args),
    }),

    canRegister: (...args) => canRegister(endpoints, dependencies, ...args),
    register: (...args) => register(endpoints, dependencies, ...args),

    did,
    hasSufficientAuthority,
    provideAuthority,
  }
}
