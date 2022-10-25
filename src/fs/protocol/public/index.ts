import { CID } from "multiformats/cid"

import { Links, HardLink, SimpleLinks } from "../../types.js"
import { TreeInfo, FileInfo, Skeleton, PutDetails } from "./types.js"
import { Metadata } from "../../metadata.js"
import { decodeCID, isValue, Maybe, blob } from "../../../common/index.js"
import { FileContent } from "../../../ipfs/index.js"

import * as check from "../../types/check.js"
import * as ipfs from "../../../ipfs/index.js"
import * as link from "../../link.js"
import * as basic from "../basic.js"


export const putTree = async (
  links: Links,
  skeletonVal: Skeleton,
  metadataVal: Metadata,
  previousCID: Maybe<CID>
): Promise<PutDetails> => {
  const userlandInfo = await basic.putLinks(links)
  const userland = link.make("userland", userlandInfo.cid, true, userlandInfo.size)
  const [ metadata, skeleton ] = await Promise.all([
    putAndMakeLink("metadata", metadataVal),
    putAndMakeLink("skeleton", skeletonVal),
  ])
  const previous = previousCID != null
    ? link.make("previous", previousCID, false, await ipfs.size(previousCID))
    : undefined

  const internalLinks = { metadata, skeleton, userland, previous } as Links
  const { cid, size } = await basic.putLinks(internalLinks)
  return {
    cid,
    userland: decodeCID(userland.cid),
    metadata: decodeCID(metadata.cid),
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
  const userlandInfo = await basic.putFile(await normalizeFileContent(content))
  const userland = link.make("userland", userlandInfo.cid, true, userlandInfo.size)
  const metadata = await putAndMakeLink("metadata", metadataVal)
  const previous = previousCID != null
    ? link.make("previous", previousCID, false, await ipfs.size(previousCID))
    : undefined

  const internalLinks = { metadata, userland, previous } as Links
  const { cid, size } = await basic.putLinks(internalLinks)
  return {
    cid,
    userland: decodeCID(userland.cid),
    metadata: decodeCID(metadata.cid),
    size,
    isFile: true,
    skeleton: {}
  }
}

export const putAndMakeLink = async (name: string, val: FileContent): Promise<HardLink> => {
  const { cid, size } = await ipfs.encoded.add(val, null)
  return link.make(name, cid, true, size)
}

export const get = async (cid: CID): Promise<TreeInfo | FileInfo> => {
  const links = await basic.getSimpleLinks(cid)
  const metadata = await getAndCheckValue(links, "metadata", check.isMetadata)
  const skeleton = metadata.isFile
    ? undefined
    : await getAndCheckValue(links, "skeleton", check.isSkeleton)

  const userland = links[ "userland" ]?.cid || null
  if (!check.isCID(userland)) throw new Error("Could not find userland")

  const previous = links[ "previous" ]?.cid || undefined
  return { userland, metadata, previous, skeleton }
}

export const getValue = async (
  linksOrCID: SimpleLinks | CID,
  name: string,
): Promise<unknown> => {
  const cid = CID.asCID(linksOrCID)

  if (check.isCID(linksOrCID)) {
    if (!cid) return null
    const links = await basic.getSimpleLinks(cid)
    return getValueFromLinks(links, name)
  }

  return getValueFromLinks(linksOrCID, name)
}

export const getValueFromLinks = async (
  links: SimpleLinks,
  name: string,
): Promise<unknown> => {
  const linkCID = links[ name ]?.cid
  if (!linkCID) return null

  return ipfs.encoded.catAndDecode(decodeCID(linkCID), null)
}

export const getAndCheckValue = async <T>(
  linksOrCid: SimpleLinks | CID,
  name: string,
  checkFn: (val: any) => val is T,
  canBeNull = false
): Promise<T> => {
  const val = await getValue(linksOrCid, name)
  return checkValue(val, name, checkFn, canBeNull)
}

export const checkValue = <T>(
  val: any,
  name: string,
  checkFn: (val: any) => val is T,
  canBeNull = false
): T => {
  if (!isValue(val)) {
    if (canBeNull) return val
    throw new Error(`Could not find header value: ${name}`)
  }
  if (checkFn(val)) {
    return val
  }
  throw new Error(`Improperly formatted header value: ${name}`)
}

export async function normalizeFileContent(content: FileContent): Promise<Uint8Array> {
  if (content instanceof Uint8Array) {
    return content
  }
  if (typeof Blob !== "undefined" && content instanceof Blob) {
    return await blob.toUint8Array(content)
  }

  const encoder = new TextEncoder()

  if (typeof content === "string") {
    return encoder.encode(content)
  }

  const json = JSON.stringify(content)
  return encoder.encode(json)
}
