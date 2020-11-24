/** @internal */

/** @internal */
import { Links } from '../../types'
import { TreeInfo, FileInfo, Skeleton, PutDetails } from './types'
import { Metadata } from '../../metadata'
import { isString } from '../../../common/type-checks'
import * as check from '../../types/check'

import { isValue, Maybe } from '../../../common'
import * as ipfs from '../../../ipfs'
import { CID, FileContent } from '../../../ipfs'
import * as link from '../../link'

import * as basic from '../basic'

export const putTree = async (
    links: Links,
    skeletonVal: Skeleton,
    metadataVal: Metadata,
    previousCID: Maybe<CID>
  ): Promise<PutDetails> => {
  const userlandInfo = await basic.putLinks(links)
  const userland = link.make('userland', userlandInfo.cid, true, userlandInfo.size)
  const [metadata, skeleton] = await Promise.all([
    putAndMakeLink('metadata', metadataVal),
    putAndMakeLink('skeleton', skeletonVal),
  ])
  const previous = previousCID != null
    ? link.make('previous', previousCID, false, await ipfs.size(previousCID))
    : undefined

  const internalLinks = { metadata, skeleton, userland, previous } as Links
  const { cid, size } = await basic.putLinks(internalLinks)
  return {
    cid,
    userland: userland.cid,
    metadata: metadata.cid,
    size,
    isFile: false,
    skeleton: skeletonVal
  }
}

export const putFile = async (
    content: FileContent,
    metadataVal: Metadata,
    previousCID: Maybe<CID>
  ): Promise<PutDetails> => {
  const userlandInfo = await basic.putFile(content)
  const userland = link.make('userland', userlandInfo.cid, true, userlandInfo.size)
  const metadata = await putAndMakeLink('metadata', metadataVal)
  const previous = previousCID != null
    ? link.make('previous', previousCID, false, await ipfs.size(previousCID))
    : undefined

  const internalLinks = { metadata, userland, previous } as Links
  const { cid, size } = await basic.putLinks(internalLinks)
  return {
    cid,
    userland: userland.cid,
    metadata: metadata.cid,
    size,
    isFile: true,
    skeleton: {}
  }
}

export const putAndMakeLink = async (name: string, val: FileContent) => {
  const { cid, size } = await ipfs.encoded.add(val, null)
  return link.make(name, cid, true, size)
}

export const get = async (cid: CID): Promise<TreeInfo | FileInfo> => {
  const links = await basic.getLinks(cid)
  const metadata = await getAndCheckValue(links, 'metadata', check.isMetadata)
  const skeleton = metadata.isFile
    ? undefined
    : await getAndCheckValue(links, 'skeleton', check.isSkeleton)

  const userland = links['userland']?.cid || null
  if (!check.isCID(userland)) throw new Error("Could not find userland")

  const previous = links['previous']?.cid || undefined
  return { userland, metadata, previous, skeleton }
}

export const getValue = async (
  linksOrCID: Links | CID,
  name: string,
): Promise<unknown> => {
  if (isString(linksOrCID)) {
    const links = await basic.getLinks(linksOrCID)
    return getValueFromLinks(links, name)
  }

  return getValueFromLinks(linksOrCID, name)
}

export const getValueFromLinks = async (
  links: Links,
  name: string,
): Promise<unknown> => {
  const linkCID = links[name]?.cid
  if (!linkCID) return null

  return ipfs.encoded.catAndDecode(linkCID, null)
}
export const getAndCheckValue = async <T>(
  linksOrCid: Links | CID,
  name: string,
  checkFn: (val: any) => val is T,
  canBeNull = false
): Promise<T> => {
  const val = await getValue(linksOrCid, name)
  return checkValue(val, name, checkFn, canBeNull)
}

export const checkValue = <T>(val: any, name: string, checkFn: (val: any) => val is T, canBeNull = false): T => {
  if(!isValue(val)){
    if(canBeNull) return val
    throw new Error(`Could not find header value: ${name}`)
  }
  if(checkFn(val)){
    return val
  }
  throw new Error(`Improperly formatted header value: ${name}`)
}
