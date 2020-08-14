import { Link, Links, HeaderV1, IpfsSerialized, PutDetails, Metadata } from '../types'
import * as check from '../types/check'
import { isString } from '../../common/type-checks'

import * as semver from '../semver'

import { Maybe } from '../../common'
import ipfs, { CID, FileContent } from '../../ipfs'
import * as link from '../link'

import * as protocol from '../protocol'

export const emptyMetadata = (): Metadata => ({
  name: '',
  isFile: false,
  mtime: Date.now(),
  ctime: Date.now(),
  version: semver.latest
})

export const empty = (): HeaderV1 => {
  const { name, isFile, mtime, ctime, version } = emptyMetadata()
  return {
    name,
    isFile,
    mtime,
    ctime,
    version,
    size: 0,
    skeleton: {},
    children: {}
  }
}

export const put = async (
    userland: Link,
    header: HeaderV1,
  ): Promise<PutDetails> => {
  const serialized = serializeForProtocol(userland.cid, header)
  const [metadata, skeleton, children] = await Promise.all([
    putAndMakeLink('metadata', serialized.metadata),
    putAndMakeLink('skeleton', serialized.skeleton),
    putAndMakeLink('children', serialized.children),
  ])
  const links = { metadata, skeleton, children, userland } as Links
  const { cid, size } = await protocol.putLinks(links)
  return { cid, userland: userland.cid, metadata: metadata.cid, size }
}

export const putAndMakeLink = async (name: string, val: FileContent) => {
  const { cid, size } = await ipfs.encoded.add(val, null)
  return link.make(name, cid, true, size)
}

export const serializeForProtocol = (userland: CID, header: HeaderV1): IpfsSerialized => {
  const { name, isFile, mtime, ctime, version, skeleton, children } = header
  const metadata = { name, isFile, mtime, ctime, version }
  return {
    metadata,
    skeleton,
    children,
    userland,
  }
}

export const toMetadata = (header: HeaderV1): Metadata => {
  const { name, isFile, mtime, ctime, version } = header
  return { name, isFile, mtime, ctime, version }
}

type Result = {
  userland: string,
  header: HeaderV1
}

export const getHeaderAndUserland = async (cid: CID): Promise<Result> => {
  const links = await protocol.getLinks(cid)
  const [metadata, skeleton, children, size] = await Promise.all([
    protocol.getAndCheckValue(links, 'metadata', check.isMetadata),
    protocol.getAndCheckValue(links, 'skeleton', check.isSkeleton),
    protocol.getAndCheckValue(links, 'children', check.isChildren),
    ipfs.size(cid),
  ])

  const userland = links['userland']?.cid || null
  if(!check.isCID(userland)) throw new Error("Could not find userland")

  const { name, isFile, mtime, ctime, version } = metadata
  return {
    userland,
    header: { name, isFile, mtime, ctime, size, version, skeleton, children }
  }
}
