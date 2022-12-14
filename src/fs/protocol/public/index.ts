import * as DagCBOR from "@ipld/dag-cbor"
import * as Uint8arrays from "uint8arrays"
import { CID } from "multiformats/cid"

import * as Check from "../../types/check.js"
import * as Depot from "../../../components/depot/implementation.js"
import * as Link from "../../link.js"
import * as Basic from "../basic.js"

import { Links, HardLink, SimpleLinks } from "../../types.js"
import { TreeInfo, FileInfo, Skeleton, PutDetails } from "./types.js"
import { Metadata } from "../../metadata.js"
import { decodeCID, encodeCID, isValue, Maybe } from "../../../common/index.js"


export const putTree = async (
  depot: Depot.Implementation,
  links: Links,
  skeletonVal: Skeleton,
  metadataVal: Metadata,
  previousCID: Maybe<CID>
): Promise<PutDetails> => {
  const userlandInfo = await Basic.putLinks(depot, links)
  const userland = Link.make("userland", userlandInfo.cid, true, userlandInfo.size)
  const [ metadata, skeleton ] = await Promise.all([
    putAndMakeLink(depot, "metadata", metadataVal),
    putAndMakeLink(depot, "skeleton", skeletonVal),
  ])
  const previous = previousCID != null
    ? Link.make("previous", previousCID, false, await depot.size(previousCID))
    : undefined

  const internalLinks = { metadata, skeleton, userland, previous } as Links
  const { cid, size } = await Basic.putLinks(depot, internalLinks)
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
  depot: Depot.Implementation,
  content: Uint8Array,
  metadataVal: Metadata,
  previousCID: Maybe<CID>
): Promise<PutDetails> => {
  const userlandInfo = await Basic.putFile(depot, content)
  const userland = Link.make("userland", userlandInfo.cid, true, userlandInfo.size)
  const metadata = await putAndMakeLink(depot, "metadata", metadataVal)
  const previous = previousCID != null
    ? Link.make("previous", previousCID, false, await depot.size(previousCID))
    : undefined

  const internalLinks = { metadata, userland, previous } as Links
  const { cid, size } = await Basic.putLinks(depot, internalLinks)
  return {
    cid,
    userland: decodeCID(userland.cid),
    metadata: decodeCID(metadata.cid),
    size,
    isFile: true,
    skeleton: {}
  }
}

export const get = async (depot: Depot.Implementation, cid: CID): Promise<TreeInfo | FileInfo> => {
  const links = await Basic.getSimpleLinks(depot, cid)
  const metadata = await getAndCheckValue(depot, links, "metadata", Check.isMetadata)
  const skeleton = metadata.isFile
    ? undefined
    : await getAndCheckValue(depot, links, "skeleton", Check.isSkeleton)

  const userland = links[ "userland" ]?.cid || null
  if (!Check.isCID(userland)) throw new Error("Could not find userland")

  const previous = links[ "previous" ]?.cid || undefined
  return { userland, metadata, previous, skeleton }
}

export const getValue = async (
  depot: Depot.Implementation,
  linksOrCID: SimpleLinks | CID,
  name: string,
): Promise<unknown> => {
  const cid = CID.asCID(linksOrCID)

  if (Check.isCID(linksOrCID)) {
    if (!cid) return null
    const links = await Basic.getSimpleLinks(depot, cid)
    return getValueFromLinks(depot, links, name)
  }

  return getValueFromLinks(depot, linksOrCID, name)
}

export const getValueFromLinks = async (
  depot: Depot.Implementation,
  links: SimpleLinks,
  name: string,
): Promise<unknown> => {
  const linkCID = links[ name ]?.cid
  if (!linkCID) return null

  const file = await Basic.getFile(depot, decodeCID(linkCID))
  const a = DagCBOR.decode(file)

  let b

  if (a instanceof Uint8Array) {
    b = JSON.parse(Uint8arrays.toString(
      a as Uint8Array, "utf8"
    ))
  } else {
    b = a
  }

  return b
}

export const getAndCheckValue = async <T>(
  depot: Depot.Implementation,
  linksOrCid: SimpleLinks | CID,
  name: string,
  checkFn: (val: any) => val is T,
  canBeNull = false
): Promise<T> => {
  const val = await getValue(depot, linksOrCid, name)
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



// ㊙️


async function putAndMakeLink(depot: Depot.Implementation, name: string, val: Object): Promise<HardLink> {
  const { cid, size } = await Basic.putFile(depot, DagCBOR.encode(val))
  return Link.make(name, cid, true, size)
}