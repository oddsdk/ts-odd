import { Maybe } from "../../../common"
import ipfs, { CID } from "../../../ipfs"
import MMPT from "./mmpt"
import { DecryptedNode, PrivateAddResult } from './types'
import * as check from './types/check'
import * as namefilter from './namefilter'
import { BareNameFilter, PrivateName } from './namefilter'
import * as basic from '../basic'

export const addNode = async (mmpt: MMPT, node: DecryptedNode, key: string): Promise<PrivateAddResult> => {
  const { cid, size } = await basic.putEncryptedFile(node, key)
  const filter = await namefilter.addRevision(node.bareNameFilter, key, node.revision)
  const name = await namefilter.toPrivateName(filter)
  await mmpt.add(name, cid)
  return { cid, name, key, size }
}

export const readNode = async (cid: CID, key: string): Promise<DecryptedNode> => {
  const content = await ipfs.encoded.catAndDecode(cid, key)
  if(!check.isDecryptedNode(content)){
    throw new Error(`Could not parse a valid filesystem object, ${cid}`)
  }
  return content
}

export const getByName = async (mmpt: MMPT, name: PrivateName, key: string): Promise<Maybe<DecryptedNode>> => {
  const cid = await mmpt.get(name)
  if(cid === null) return null
  return getByCID(mmpt, cid, key)
}

export const getByCID = async (mmpt: MMPT, cid: CID, key: string): Promise<DecryptedNode> => {
  const node = await readNode(cid, key)
  const latest = await findLatestRevision(mmpt, node.bareNameFilter, key, node.revision)
  return latest?.cid
    ? readNode(latest?.cid, key)
    : node
}

type Revision = {
  cid: CID
  name: PrivateName
}

export const findLatestRevision = async (mmpt: MMPT, bareName: BareNameFilter, key: string, lastKnownRevision: number): Promise<Maybe<Revision>> => {
  let lowerBound = lastKnownRevision, upperBound = null
  let i = 1
  let lastRevision: Maybe<Revision> = null
  while(upperBound === null){
    const toCheck = lastKnownRevision + Math.pow(i, 2)
    const thisRevision = await getRevision(mmpt, bareName, key, toCheck)
    if(thisRevision !== null){
      lastRevision = thisRevision
      lowerBound = toCheck
    }else{
      upperBound = toCheck
    }
    i++
  }

  while(lowerBound < (upperBound - 1)) {
    const midpoint = Math.floor((upperBound + lowerBound) / 2)
    const thisRevision = await getRevision(mmpt, bareName, key, midpoint)
    if(thisRevision !== null) {
      lastRevision = thisRevision
      lowerBound = midpoint
    }else{
      upperBound = midpoint
    }
  }
  return lastRevision
}

export const getRevision = async (mmpt: MMPT, bareName: BareNameFilter, key: string, revision: number): Promise<Maybe<Revision>> => {
  const filter = await namefilter.addRevision(bareName, key, revision)
  const name = await namefilter.toPrivateName(filter)
  const cid = await mmpt.get(name)
  return cid ? { cid, name } : null
}
