import { SymmAlg } from "keystore-idb/lib/types.js"

import { Maybe } from "../../../common/index.js"
import * as ipfs from "../../../ipfs/index.js"
import { CID } from "../../../ipfs/index.js"
import MMPT from "./mmpt.js"
import { DecryptedNode, PrivateAddResult, Revision } from "./types.js"
import * as check from "./types/check.js"
import * as namefilter from "./namefilter.js"
import { BareNameFilter, PrivateName } from "./namefilter.js"
import * as basic from "../basic.js"


export const addNode = async (mmpt: MMPT, node: DecryptedNode, key: string, algorithm: SymmAlg): Promise<PrivateAddResult> => {
  const { cid, size } = await basic.putEncryptedFile(node, key, algorithm)
  const filter = await namefilter.addRevision(node.bareNameFilter, key, node.revision)
  const name = await namefilter.toPrivateName(filter)
  await mmpt.add(name, cid)

  // if the node is a file, we also add the content to the MMPT
  if (check.isPrivateFileInfo(node)) {
    const contentBareFilter = await namefilter.addToBare(node.bareNameFilter, node.key)
    const contentFilter = await namefilter.addRevision(contentBareFilter, node.key, node.revision)
    const contentName = await namefilter.toPrivateName(contentFilter)
    await mmpt.add(contentName, node.content)
  }

  const [skeleton, isFile] = check.isPrivateFileInfo(node) ? [{}, true] : [node.skeleton, false]
  return { cid, name, key, algorithm, size, isFile, skeleton }
}

export const readNode = async (cid: CID, key: string, alg: SymmAlg): Promise<DecryptedNode> => {
  const content = await ipfs.encoded.catAndDecode(cid, { key, alg })
  if (!check.isDecryptedNode(content)) {
    throw new Error(`Could not parse a valid filesystem object, ${cid}`)
  }
  return content
}

export const getByName = async (mmpt: MMPT, name: PrivateName, key: string, alg: SymmAlg): Promise<Maybe<DecryptedNode>> => {
  const cid = await mmpt.get(name)
  if (cid === null) return null
  return getByCID(cid, key, alg)
}

export const getByCID = async (cid: CID, key: string, alg: SymmAlg): Promise<DecryptedNode> => {
  return await readNode(cid, key, alg)
}

export const getByLatestName = async (mmpt: MMPT, name: PrivateName, key: string, alg: SymmAlg): Promise<Maybe<DecryptedNode>> => {
  const cid = await mmpt.get(name)
  if (cid === null) return null
  return getLatestByCID(mmpt, cid, key, alg)
}

export const getLatestByCID = async (mmpt: MMPT, cid: CID, key: string, alg: SymmAlg): Promise<DecryptedNode> => {
  const node = await getByCID(cid, key, alg)
  const latest = await findLatestRevision(mmpt, node.bareNameFilter, key, node.revision)
  return latest?.cid
    ? await getByCID(latest?.cid, key, alg)
    : node
}

export const getLatestByBareNameFilter = async(mmpt: MMPT, bareName: BareNameFilter, key: string, alg: SymmAlg): Promise<Maybe<DecryptedNode>> => {
  const revisionFilter = await namefilter.addRevision(bareName, key, 1)
  const name = await namefilter.toPrivateName(revisionFilter)
  return getByLatestName(mmpt, name, key, alg)
}

export const findLatestRevision = async (mmpt: MMPT, bareName: BareNameFilter, key: string, lastKnownRevision: number): Promise<Maybe<Revision>> => {
  // Exponential search forward
  let lowerBound = lastKnownRevision, upperBound = null
  let i = 0
  let lastRevision: Maybe<Revision> = null

  while (upperBound === null) {
    const toCheck = lastKnownRevision + Math.pow(2, i)
    const thisRevision = await getRevision(mmpt, bareName, key, toCheck)

    if (thisRevision !== null) {
      lastRevision = thisRevision
      lowerBound = toCheck
    } else {
      upperBound = toCheck
    }

    i++
  }

  // Binary search back
  while (lowerBound < (upperBound - 1)) {
    const midpoint = Math.floor((upperBound + lowerBound) / 2)
    const thisRevision = await getRevision(mmpt, bareName, key, midpoint)

    if (thisRevision !== null) {
      lastRevision = thisRevision
      lowerBound = midpoint
    } else {
      upperBound = midpoint
    }
  }

  return lastRevision
}

export const getRevision = async (mmpt: MMPT, bareName: BareNameFilter, key: string, revision: number): Promise<Maybe<Revision>> => {
  const filter = await namefilter.addRevision(bareName, key, revision)
  const name = await namefilter.toPrivateName(filter)
  const cid = await mmpt.get(name)
  return cid ? { cid, name, number: revision } : null
}
