import * as Fission from "../../../../common/fission.js"
import * as Identifier from "../../../identifier/implementation.js"
import * as Common from "./common.js"

import { Names } from "../../../../repositories/names.js"
import { Ticket } from "../../../../ticket/types.js"
import { Implementation } from "../../implementation.js"
import { Annex, Dependencies } from "./common.js"

////////
// 🧩 //
////////

export { Annex }

//////////////
// CREATION //
//////////////

export async function canRegister(
  formValues: Record<string, string>
): Promise<{ canRegister: true } | { canRegister: false; reason: string }> {
  return {
    canRegister: false,
    reason: "This implementation does not support registration",
  }
}

export async function register(
  identifier: Identifier.Implementation,
  names: Names,
  formValues: Record<string, string>
): Promise<
  | { registered: true; tickets: Ticket[] }
  | { registered: false; reason: string }
> {
  return {
    registered: false,
    reason: "This implementation does not support registration",
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
      volume: (...args) => Common.volume(endpoints, dependencies, identifier, inventory, names, ...args),
    }),

    canRegister,
    register,

    did: (...args) => Common.did(dependencies, ...args),
    hasSufficientAuthority: (...args) => Common.hasSufficientAuthority(dependencies, ...args),
    provideAuthority: Common.provideAuthority,
  }
}
