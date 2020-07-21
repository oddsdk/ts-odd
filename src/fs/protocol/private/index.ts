import { Maybe, removeKeyFromObj } from "../../../common"
import ipfs, { CID } from "../../../ipfs"
import MMPT from "./mmpt"
import { BareNameFilter, DecryptedNode, PrivateDirectory, PrivateFile, Revision } from './types'
import * as check from './types/check'
import * as namefilter from './namefilter'
import { Metadata } from "../../types"
import * as semver from '../../semver'

export const emptyMetadata = (): Metadata => ({
  name: '',
  isFile: false,
  mtime: Date.now(),
  ctime: Date.now(),
  version: semver.latest
})

export const readNode = async (cid: CID, key: string): Promise<DecryptedNode> => {
  const content = await ipfs.encoded.catAndDecode(cid, key)
  if(!check.isDecryptedNode(content)){
    throw new Error(`Could not parse a valid filesystem object, ${cid}`)
  }
  return content
}

export const createPrivateFile = async (parentNameFilter: BareNameFilter, name: string, key: string, ownKey: string, content: CID): Promise<PrivateFile> => {
  const bareNameFilter = await namefilter.addToBare(parentNameFilter, key)
  return {
    metadata: {
      ...emptyMetadata(),
      name,
      isFile: true
    },
    bareNameFilter,
    revision: 0,
    key: ownKey,
    content,
  }
}

export const createPrivateDir = async (parentNameFilter: BareNameFilter, name: string, key: string): Promise<PrivateDirectory> => {
  const bareNameFilter = await namefilter.addToBare(parentNameFilter, key)
  return {
    metadata: {
      ...emptyMetadata(),
      name
    },
    bareNameFilter,
    revision: 0,
    children: {},
    skeleton: {},
  }
}

export const removeChildFromDir = (dir: PrivateDirectory, toRemove: string): PrivateDirectory => {
  return {
    ...dir,
    revision: dir.revision + 1,
    children: removeKeyFromObj(dir.children, toRemove),
    skeleton: removeKeyFromObj(dir.skeleton, toRemove),
  }
}

export const updateFile = async(file: PrivateFile, content: CID) => {
  return {
    ...file,
    metadata: {
      ...file.metadata,
      mtime: Date.now()
    },
    revision: file.revision + 1,
    content
  }
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
