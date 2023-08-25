import * as Fission from "../../../../common/fission.js"
import * as Ucan from "../../../../ucan/ts-ucan/index.js"
import * as Identifier from "../../../identifier/implementation.js"

import { CID } from "../../../../common/index.js"
import { Agent, DNS, Manners } from "../../../../components.js"
import { Inventory } from "../../../../ticket/inventory.js"
import { Ticket } from "../../../../ticket/types.js"
import { DataRoot, lookupUserDID } from "../index.js"

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
  volume: (username?: string) => Promise<{
    dataRoot?: CID
    dataRootUpdater: (
      dataRoot: CID,
      proofs: Ticket[]
    ) => Promise<{ updated: true } | { updated: false; reason: string }>
    did: string
  }>
}

export type Dependencies<FS> = {
  agent: Agent.Implementation
  dns: DNS.Implementation
  identifier: Identifier.Implementation // TODO: Remove
  manners: Manners.Implementation<FS>
}

///////////////
// DATA ROOT //
///////////////

export async function volume<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  tickets: Inventory,
  username?: string
): Promise<{
  dataRoot?: CID
  dataRootUpdater: (
    dataRoot: CID,
    proofs: Ticket[]
  ) => Promise<{ updated: true } | { updated: false; reason: string }>
  did: string
}> {
  const accountProof = findAccountProofUCAN(await identifier.did(), tickets)
  const accountUsername = accountProof ? findUsernameFact(accountProof) : null

  if (username && username !== accountUsername) {
    return otherVolume(endpoints, dependencies, identifier, tickets, username)
  } else {
    return accountVolume(endpoints, dependencies, identifier, tickets)
  }
}

export async function accountVolume<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  tickets: Inventory
): Promise<{
  dataRoot?: CID
  dataRootUpdater: (
    dataRoot: CID,
    proofs: Ticket[]
  ) => Promise<{ updated: true } | { updated: false; reason: string }>
  did: string
}> {
  const dataRootUpdater = async (dataRoot: CID, proofs: Ticket[]) => {
    const { suffices } = await hasSufficientAuthority(dependencies, identifier, tickets)
    if (!suffices) return { updated: false, reason: "Not authenticated yet, lacking authority." }
    return updateDataRoot(endpoints, dependencies, identifier, tickets, dataRoot, proofs)
  }

  const { suffices } = await hasSufficientAuthority(dependencies, identifier, tickets)
  const identifierDID = await identifier.did()

  if (!suffices) {
    return {
      dataRoot: undefined,
      dataRootUpdater,
      did: identifierDID,
    }
  }

  if (!dependencies.manners.program.online()) {
    return {
      dataRoot: undefined,
      dataRootUpdater,
      did: await fileSystemDID(dependencies, identifier, tickets) || identifierDID,
    }
  }

  // Find account-proof UCAN
  const accountProof = findAccountProofUCAN(identifierDID, tickets)
  const username = accountProof ? findUsernameFact(accountProof) : null

  if (!username) {
    throw new Error(
      "Expected a username to be stored in the UCAN facts"
    )
  }

  return {
    dataRoot: await DataRoot.lookup(endpoints, dependencies, username).then(a => a || undefined),
    dataRootUpdater,
    did: await fileSystemDID(dependencies, identifier, tickets) || identifierDID,
  }
}

export async function otherVolume<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  tickets: Inventory,
  username: string
): Promise<{
  dataRoot?: CID
  dataRootUpdater: (
    dataRoot: CID,
    proofs: Ticket[]
  ) => Promise<{ updated: true } | { updated: false; reason: string }>
  did: string
}> {
  if (!dependencies.manners.program.online()) {
    throw new Error("Cannot load another user's volume while offline")
  }

  const userDID = await lookupUserDID(endpoints, dependencies.dns, username)
  if (!userDID) throw new Error("User not found")

  const dataRootUpdater = async (dataRoot: CID, proofs: Ticket[]) => {
    // TODO: Add ability to update data root of another user
    //       For this we need the account capability to update the volume pointer.
    throw new Error("Not implemented yet")
  }

  return {
    dataRoot: await DataRoot.lookup(endpoints, dependencies, username).then(a => a || undefined),
    dataRootUpdater,
    did: userDID,
  }
}

export async function updateDataRoot<FS>(
  endpoints: Fission.Endpoints,
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  tickets: Inventory,
  dataRoot: CID,
  proofs: Ticket[]
): Promise<{ updated: true } | { updated: false; reason: string }> {
  if (!dependencies.manners.program.online()) {
    return { updated: false, reason: "NO_INTERNET_CONNECTION" }
  }

  // Find account-proof UCAN
  const accountProof = findAccountProofUCAN(await identifier.did(), tickets)
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
  tickets: Inventory
): Promise<string | null> {
  // Find account-proof UCAN
  const accountProof = findAccountProofUCAN(await identifier.did(), tickets)

  // DID is issuer of that username UCAN
  return accountProof
    ? Ucan.decode(accountProof.token).payload.iss
    : null
}

export async function fileSystemDID<FS>(
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  tickets: Inventory
) {
  // Find account-proof UCAN
  const accountProof = findAccountProofUCAN(await identifier.did(), tickets)

  // DID is issuer of that username UCAN
  return accountProof
    ? Ucan.decode(accountProof.token).payload.aud
    : null
}

export async function hasSufficientAuthority<FS>(
  dependencies: Dependencies<FS>,
  identifier: Identifier.Implementation,
  tickets: Inventory
): Promise<
  { suffices: true } | { suffices: false; reason: string }
> {
  const accountProof = findAccountProofUCAN(await identifier.did(), tickets)
  return accountProof ? { suffices: true } : { suffices: false, reason: "Missing the needed account capabilities" }
}

////////
// 🛠️ //
////////

/**
 * Find the original UCAN the user got back from the Fission server
 * after registration. This UCAN will have the username fact.
 */
export function findAccountProofUCAN(
  audience: string,
  tickets: Inventory
): Ticket | null {
  const matcher = (ticket: Ticket) => !!findUsernameFact(ticket)

  // Grab the UCANs addressed to this audience (ideally current identifier),
  // then look for the username fact ucan in the delegation chains of those UCANs.
  return tickets.lookupByAudience(audience).reduce(
    (acc: Ticket | null, ticket) => {
      if (acc) return acc
      return tickets.descendUntilMatching(ticket, matcher, Ucan.ticketProofResolver)
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
 * device it would be the delegated UCAN.
 */
export function findAccountUCAN(
  audience: string,
  tickets: Inventory
) {
  const matcher = (ticket: Ticket) => !!findUsernameFact(ticket)

  // Grab the UCANs addressed to this audience (ideally current identifier),
  // then look for the username fact ucan in the delegation chains of those UCANs.
  return tickets.lookupByAudience(audience).reduce(
    (acc: Ticket | null, ticket) => {
      if (acc) return acc
      const hasProof = !!tickets.descendUntilMatching(ticket, matcher, Ucan.ticketProofResolver)
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
