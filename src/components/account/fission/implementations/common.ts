import * as Fission from "../../../../common/fission.js"
import * as Ucan from "../../../../ucan/ts-ucan/index.js"
import * as Identifier from "../../../identifier/implementation.js"

import { AccountQuery } from "../../../../authority/query.js"
import { CID } from "../../../../common/index.js"
import { Agent, DNS, Manners } from "../../../../components.js"
import { FileSystemCarrier } from "../../../../fs/types.js"
import { Inventory } from "../../../../inventory.js"
import { Names } from "../../../../repositories/names.js"
import { Ticket } from "../../../../ticket/types.js"
import { DataRoot, lookupUserDID } from "../index.js"

////////
// 🏔️ //
////////

export const NAMES = {
  fileSystem(identifierDID: string) {
    return `ACCOUNT_FILE_SYSTEM_DID#${identifierDID}`
  },
}

////////
// 🧩 //
////////

export type Annex = {
  /**
   * Create a progressive volume for a Fission account.
   *
   * This method can be used to load a local-only file system before an account is registered.
   * When you register an account, the file system will sync with the Fission server, making it available through Fission IPFS nodes.
   */
  volume: (username?: string) => Promise<FileSystemCarrier>
}

export type Dependencies<FS> = {
  agent: Agent.Implementation
  dns: DNS.Implementation
  identifier: Identifier.Implementation // TODO: Remove
  manners: Manners.Implementation<FS>
}

/////////////////
// FILE SYSTEM //
/////////////////

export async function volume<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  inventory: Inventory,
  names: Names,
  username?: string
): Promise<FileSystemCarrier> {
  const accountProof = findAccountProofTicket(identifier.did(), inventory)
  const accountUsername = accountProof ? findUsernameFact(accountProof) : null

  if (username && username !== accountUsername) {
    throw new Error("Loading a volume of another user is currently disabled")
    // TODO: return otherVolume(endpoints, dependencies, identifier, inventory, username)
  } else {
    return accountVolume(endpoints, dependencies, identifier, inventory, names)
  }
}

export async function accountVolume<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  inventory: Inventory,
  names: Names
): Promise<FileSystemCarrier> {
  const dataRootUpdater = async (dataRoot: CID, proofs: Ticket[]) => {
    const { suffices } = await hasSufficientAuthority(dependencies, identifier, inventory)
    if (!suffices) return { updated: false, reason: "Not authenticated yet, lacking authority." }
    return updateDataRoot(endpoints, dependencies, identifier, inventory, dataRoot, proofs)
  }

  const { suffices } = await hasSufficientAuthority(dependencies, identifier, inventory)
  const identifierDID = identifier.did()

  if (!suffices) {
    const name = NAMES.fileSystem(identifierDID)
    const did = names.subject(name)

    return did
      ? { dataRootUpdater, id: { did } }
      : { dataRootUpdater, id: { name } }
  }

  // Find account-proof UCAN
  const accountProof = findAccountProofTicket(identifierDID, inventory)

  if (!accountProof) {
    throw new Error("Expected to find account proof")
  }

  const name = NAMES.fileSystem(accountProof.audience)
  const did = names.subject(name)

  if (!did) {
    // futile, because a file system should not be loaded in this state.
    return { dataRootUpdater, futile: true, id: { name } }
  }

  if (!dependencies.manners.program.online()) {
    return {
      dataRoot: undefined,
      dataRootUpdater,
      id: { did },
    }
  }

  // TODO: Keep username in `names` as well
  const username = accountProof ? findUsernameFact(accountProof) : null

  if (!username) {
    throw new Error(
      "Expected a username to be stored in the UCAN facts"
    )
  }

  return {
    dataRoot: await DataRoot.lookup(endpoints, dependencies, username).then(a => a || undefined),
    dataRootUpdater,
    id: { did },
  }
}

// TODO: Disabled because it isn't using the correct DID
//
// export async function otherVolume<FS>(
//   endpoints: Fission.Endpoints,
//   dependencies: Dependencies<FS>,
//   identifier: Identifier.Implementation,
//   inventory: Inventory,
//   username: string
// ): Promise<FileSystemCarrier> {
//   if (!dependencies.manners.program.online()) {
//     throw new Error("Cannot load another user's volume while offline")
//   }
//
//   const userDID = await lookupUserDID(endpoints, dependencies.dns, username)
//   if (!userDID) throw new Error("User not found")
//
//   const dataRootUpdater = async (dataRoot: CID, proofs: Ticket[]) => {
//     // TODO: Add ability to update data root of another user
//     //       For this we need the account capability to update the volume pointer.
//     throw new Error("Not implemented yet")
//   }
//
//   return {
//     dataRoot: await DataRoot.lookup(endpoints, dependencies, username).then(a => a || undefined),
//     dataRootUpdater,
//     // FIXME: This DID is not correct!
//     did: userDID,
//   }
// }

export async function updateDataRoot<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  inventory: Inventory,
  dataRoot: CID,
  proofs: Ticket[]
): Promise<{ updated: true } | { updated: false; reason: string }> {
  if (!dependencies.manners.program.online()) {
    return { updated: false, reason: "NO_INTERNET_CONNECTION" }
  }

  // Find account-proof UCAN
  const accountProof = findAccountProofTicket(identifier.did(), inventory)
  const username = accountProof ? findUsernameFact(accountProof) : null

  if (!username) {
    return { updated: false, reason: "Expected a username to be stored in the UCAN facts" }
  }

  // 🚀
  return DataRoot.update(endpoints, dependencies, dataRoot, proofs, username)
}

////////////////////////////
// IDENTIFIER & AUTHORITY //
////////////////////////////

export async function did<FS>(
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  inventory: Inventory
): Promise<string | null> {
  // Find account-proof UCAN
  const accountProof = findAccountProofTicket(identifier.did(), inventory)

  // DID is issuer of that username UCAN
  return accountProof
    ? accountProof.issuer
    : null
}

export async function fileSystemDID<FS>(
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  inventory: Inventory
) {
  // Find account-proof UCAN
  const accountProof = findAccountProofTicket(identifier.did(), inventory)

  // DID is issuer of that username UCAN
  return accountProof
    ? accountProof.audience
    : null
}

export async function hasSufficientAuthority<FS>(
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  inventory: Inventory
): Promise<
  { suffices: true } | { suffices: false; reason: string }
> {
  const accountProof = findAccountProofTicket(identifier.did(), inventory)
  return accountProof ? { suffices: true } : { suffices: false, reason: "Missing the needed account capabilities" }
}

export async function provideAuthority(
  accountQuery: AccountQuery,
  identifier: Identifier.Implementation,
  inventory: Inventory
): Promise<Ticket[]> {
  const maybeTicket = findAccountTicket(
    identifier.did(),
    inventory
  )

  if (!maybeTicket) return []
  return [maybeTicket]
}

////////
// 🛠️ //
////////

/**
 * Find the original UCAN the user got back from the Fission server
 * after registration. This UCAN will have the username fact.
 */
export function findAccountProofTicket(
  audience: string,
  inventory: Inventory
): Ticket | null {
  const matcher = (ticket: Ticket) => !!findUsernameFact(ticket)

  // Grab the UCANs addressed to this audience (ideally current identifier),
  // then look for the username fact ucan in the delegation chains of those UCANs.
  return inventory.lookupTicketsByAudience(audience).reduce(
    (acc: Ticket | null, ticket) => {
      if (acc) return acc
      return inventory.descendUntilMatchingTicket(ticket, matcher, Ucan.ticketProofResolver)
    },
    null
  )
}

/**
 * Find the account UCAN.
 *
 * The account UCAN could be the account-proof UCAN (see function above)
 * or the chain that has the account-proof UCAN in it.
 *
 * In other words, if the device that originally registered the account
 * linked to another device, it would delegate the account-proof UCAN
 * to the other device. If then asked for the account UCAN on that other
 * device it would be the delegation UCAN.
 */
export function findAccountTicket(
  audience: string,
  inventory: Inventory
): Ticket | null {
  const matcher = (ticket: Ticket) => !!findUsernameFact(ticket)

  // Grab the UCANs addressed to this audience (ideally current identifier),
  // then look for the username fact ucan in the delegation chains of those UCANs.
  return inventory.lookupTicketsByAudience(audience).reduce(
    (acc: Ticket | null, ticket) => {
      if (acc) return acc
      const hasProof = !!inventory.descendUntilMatchingTicket(ticket, matcher, Ucan.ticketProofResolver)
      if (hasProof) return ticket
      return null
    },
    null
  )
}

/**
 * Look through the facts of a UCAN and get the username fact.
 */
export function findUsernameFact(ticket: Ticket): string | null {
  const ucan = Ucan.decode(ticket.token)
  const fact = (ucan.payload.fct || []).find(f => !!f["username"])
  if (!fact) return null

  const u = fact["username"]
  if (typeof u === "string") return u
  return null
}
