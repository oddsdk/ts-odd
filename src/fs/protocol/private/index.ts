import * as Uint8arrays from "uint8arrays"
import type { CID } from "multiformats/cid"

import * as Basic from "../basic.js"
import * as Check from "./types/check.js"
import * as Crypto from "../../../components/crypto/implementation.js"
import * as Depot from "../../../components/depot/implementation.js"
import * as Namefilter from "./namefilter.js"

import { BareNameFilter, PrivateName } from "./namefilter.js"
import { DecryptedNode, PrivateAddResult, Revision } from "./types.js"
import { Maybe, decodeCID } from "../../../common/index.js"
import MMPT from "./mmpt.js"


export const addNode = async (
  depot: Depot.Implementation,
  crypto: Crypto.Implementation,
  mmpt: MMPT,
  node: DecryptedNode,
  key: Uint8Array
): Promise<PrivateAddResult> => {
  const { cid, size } = await Basic.putEncryptedFile(depot, crypto, node, key)
  const filter = await Namefilter.addRevision(crypto, node.bareNameFilter, key, node.revision)
  const name = await Namefilter.toPrivateName(crypto, filter)

  await mmpt.add(name, cid)

  // if the node is a file, we also add the content to the MMPT
  if (Check.isPrivateFileInfo(node)) {
    const key = Uint8arrays.fromString(node.key, "base64pad")
    const contentBareFilter = await Namefilter.addToBare(crypto, node.bareNameFilter, Namefilter.legacyEncodingMistake(key, "base64pad"))
    const contentFilter = await Namefilter.addRevision(crypto, contentBareFilter, key, node.revision)
    const contentName = await Namefilter.toPrivateName(crypto, contentFilter)
    await mmpt.add(contentName, decodeCID(node.content))
  }

  const [ skeleton, isFile ] = Check.isPrivateFileInfo(node) ? [ {}, true ] : [ node.skeleton, false ]
  return { cid, name, key, size, isFile, skeleton }
}

export const readNode = async (
  depot: Depot.Implementation,
  crypto: Crypto.Implementation,
  cid: CID,
  key: Uint8Array
): Promise<DecryptedNode> => {
  const contentBytes = await Basic.getEncryptedFile(depot, crypto, cid, key)
  const content = JSON.parse(Uint8arrays.toString(contentBytes, "utf8"))
  if (!Check.isDecryptedNode(content)) {
    throw new Error(`Could not parse a valid filesystem object: ${content}`)
  }
  return content
}

export const getByName = async (
  depot: Depot.Implementation,
  crypto: Crypto.Implementation,
  mmpt: MMPT,
  name: PrivateName,
  key: Uint8Array
): Promise<Maybe<DecryptedNode>> => {
  const cid = await mmpt.get(name)
  if (cid === null) return null
  return getByCID(depot, crypto, cid, key)
}

export const getByCID = async (
  depot: Depot.Implementation,
  crypto: Crypto.Implementation,
  cid: CID,
  key: Uint8Array
): Promise<DecryptedNode> => {
  return await readNode(depot, crypto, cid, key)
}

export const getLatestByName = async (
  depot: Depot.Implementation,
  crypto: Crypto.Implementation,
  mmpt: MMPT,
  name: PrivateName,
  key: Uint8Array
): Promise<Maybe<DecryptedNode>> => {
  const cid = await mmpt.get(name)
  if (cid === null) return null
  return getLatestByCID(depot, crypto, mmpt, cid, key)
}

export const getLatestByCID = async (
  depot: Depot.Implementation,
  crypto: Crypto.Implementation,
  mmpt: MMPT,
  cid: CID,
  key: Uint8Array
): Promise<DecryptedNode> => {
  const node = await getByCID(depot, crypto, cid, key)
  const latest = await findLatestRevision(crypto, mmpt, node.bareNameFilter, key, node.revision)
  return latest?.cid
    ? await getByCID(depot, crypto, decodeCID(latest?.cid), key)
    : node
}

export const getLatestByBareNameFilter = async (
  depot: Depot.Implementation,
  crypto: Crypto.Implementation,
  mmpt: MMPT,
  bareName: BareNameFilter,
  key: Uint8Array
): Promise<Maybe<DecryptedNode>> => {
  const revisionFilter = await Namefilter.addRevision(crypto, bareName, key, 1)
  const name = await Namefilter.toPrivateName(crypto, revisionFilter)
  return getLatestByName(depot, crypto, mmpt, name, key)
}

export const findLatestRevision = async (
  crypto: Crypto.Implementation,
  mmpt: MMPT,
  bareName: BareNameFilter,
  key: Uint8Array,
  lastKnownRevision: number
): Promise<Maybe<Revision>> => {
  // Exponential search forward
  let lowerBound = lastKnownRevision, upperBound = null
  let i = 0
  let lastRevision: Maybe<Revision> = null

  while (upperBound === null) {
    const toCheck = lastKnownRevision + Math.pow(2, i)
    const thisRevision = await getRevision(crypto, mmpt, bareName, key, toCheck)

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
    const thisRevision = await getRevision(crypto, mmpt, bareName, key, midpoint)

    if (thisRevision !== null) {
      lastRevision = thisRevision
      lowerBound = midpoint
    } else {
      upperBound = midpoint
    }
  }

  return lastRevision
}

export const getRevision = async (
  crypto: Crypto.Implementation,
  mmpt: MMPT,
  bareName: BareNameFilter,
  key: Uint8Array,
  revision: number
): Promise<Maybe<Revision>> => {
  const filter = await Namefilter.addRevision(crypto, bareName, key, revision)
  const name = await Namefilter.toPrivateName(crypto, filter)
  const cid = await mmpt.get(name)
  return cid ? { cid, name, number: revision } : null
}
