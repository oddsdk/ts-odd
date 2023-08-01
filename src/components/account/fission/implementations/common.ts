import * as AgentDID from "../../../../agent/did.js"
import * as Fission from "../../../../common/fission.js"
import * as Ucan from "../../../../ucan/index.js"
import * as Identifier from "../../../identifier/implementation.js"

import { CID } from "../../../../common/index.js"
import { Agent, DNS, Manners } from "../../../../components.js"
import { FileSystem } from "../../../../fs/class.js"
import { Dictionary } from "../../../../ucan/dictionary.js"
import { DataRoot } from "../index.js"

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
    const { suffices } = await hasSufficientAuthority(dependencies, identifier, ucanDictionary)
    if (!suffices) return { updated: false, reason: "Not authenticated yet, lacking authority." }
    return updateDataRoot(endpoints, dependencies, identifier, ucanDictionary, dataRoot, proofs)
  }

  const { suffices } = await hasSufficientAuthority(dependencies, identifier, ucanDictionary)
  const identifierDID = await identifier.did()

  if (!suffices) {
    return {
      dataRoot: undefined,
      dataRootUpdater,
      did: identifierDID,
    }
  }

  if (!navigator.onLine) {
    return {
      dataRoot: undefined,
      dataRootUpdater,
      did: identifierDID, // FIXME: Needs to be → didUsedForRegistration || identifierDID
    }
  }

  // FIXME: This should be the identifier DID ideally,
  //        new fission-server doesn't support nested UCANs yet (ie. proofs)
  const audience = await dependencies.agent.did()

  // Find UCAN with username in it
  const usernameUCAN = findUsernameUCAN(audience, ucanDictionary)
  const username = usernameUCAN ? findUsernameFact(usernameUCAN) : null

  if (!username) {
    throw new Error(
      "Expected a username to be stored in the UCAN facts"
    )
  }

  return {
    dataRoot: await DataRoot.lookup(endpoints, dependencies, username).then(a => a || undefined),
    dataRootUpdater,
    did: identifierDID, // FIXME: Needs to be → didUsedForRegistration || identifierDID
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

  // FIXME: This should be the identifier DID ideally,
  //        new fission-server doesn't support nested UCANs yet (ie. proofs)
  const audience = await dependencies.agent.did()

  // Find UCAN with username in it
  const usernameUCAN = findUsernameUCAN(audience, ucanDictionary)
  const username = usernameUCAN ? findUsernameFact(usernameUCAN) : null

  if (!username) {
    return { updated: false, reason: "Expected a username to be stored in the UCAN facts" }
  }

  // 🚀
  return DataRoot.update(endpoints, dependencies, dataRoot, proofs, username)
}

////////////////////////////
// IDENTIFIER & AUTHORITY //
////////////////////////////

export async function did(
  dependencies: Dependencies,
  identifier: Identifier.Implementation,
  ucanDictionary: Dictionary
): Promise<string | null> {
  // FIXME: This should be the identifier DID ideally,
  //        new fission-server doesn't support nested UCANs yet (ie. proofs)
  const audience = await dependencies.agent.did()

  // Find UCAN with username in it
  const usernameUCAN = findUsernameUCAN(audience, ucanDictionary)

  // DID is issuer of that username UCAN
  return usernameUCAN
    ? usernameUCAN.payload.iss
    : null
}

export async function hasSufficientAuthority(
  dependencies: Dependencies,
  identifier: Identifier.Implementation,
  ucanDictionary: Dictionary
): Promise<
  { suffices: true } | { suffices: false; reason: string }
> {
  // FIXME: This should be the identifier DID ideally,
  //        new fission-server doesn't support nested UCANs yet (ie. proofs)
  const audience = await dependencies.agent.did()

  // Find UCAN with username in it
  const usernameUCAN = findUsernameUCAN(audience, ucanDictionary)

  // Suffices
  return usernameUCAN ? { suffices: true } : { suffices: false, reason: "Missing the needed account capabilities" }
}

////////
// 🛠️ //
////////

export function findUsernameFact(ucan: Ucan.Ucan): string | null {
  const fact = (ucan.payload.fct || []).find(f => !!f["username"])
  if (!fact) return null

  const u = fact["username"]
  if (typeof u === "string") return u
  return null
}

export function findUsernameUCAN(
  audience: string,
  ucanDictionary: Dictionary
): Ucan.Ucan | null {
  const matcher = (ucan: Ucan.Ucan) => !!findUsernameFact(ucan)

  // Grab the UCANs addressed to this audience (ideally current identifier),
  // then look for the username fact ucan in the delegation chains of those UCANs.
  return ucanDictionary.lookupByAudience(audience).reduce(
    (acc: Ucan.Ucan | null, ucan) => {
      if (acc) return acc
      if (matcher(ucan)) return ucan
      return ucanDictionary.descendUntilMatching(ucan, matcher)
    },
    null
  )
}
