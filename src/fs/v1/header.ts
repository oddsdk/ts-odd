import { Link, Links, HeaderV1, IpfsSerialized, PutDetails, Metadata } from '../types'
import * as check from '../types/check'
import { isString } from '../../common/type-checks'

import * as semver from '../semver'

import { Maybe } from '../../common'
import ipfs, { CID, FileContent } from '../../ipfs'
import * as link from '../link'

import * as protocol from '../protocol'


export const empty = (): HeaderV1 => ({
  name: '',
  isFile: false,
  mtime: Date.now(),
  ctime: Date.now(),
  size: 0,
  version: semver.latest,
  key: null,
  skeleton: {},
  children: {}
})

export const put = async (
    userland: Link,
    header: HeaderV1,
    parentKey: Maybe<string>
  ): Promise<PutDetails> => {
  const serialized = serializeForProtocol(userland.cid, header)
  const [metadata, skeleton, children, key] = await Promise.all([
    putAndMakeLink('metadata', serialized.metadata, parentKey),
    putAndMakeLink('skeleton', serialized.skeleton, parentKey),
    putAndMakeLink('children', serialized.children, parentKey),
    serialized.key !== null ? putAndMakeLink('key', serialized.key, parentKey) : null,
  ])
  const links = { metadata, skeleton, children, userland } as Links
  if(key !== null) links.key = key
  const { cid, size } = await protocol.putLinks(links, parentKey)
  return { cid, userland: userland.cid, metadata: metadata.cid, size }
}

export const putAndMakeLink = async (name: string, val: FileContent, key: Maybe<string>) => {
  const { cid, size } = await ipfs.encoded.add(val, key)
  return link.make(name, cid, true, size)
}

export const serializeForProtocol = (userland: CID, header: HeaderV1): IpfsSerialized => {
  const { name, isFile, mtime, ctime, version, skeleton, children, key } = header
  const metadata = { name, isFile, mtime, ctime, version }
  return {
    metadata,
    skeleton,
    children,
    userland,
    key
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

export const getHeaderAndUserland = async (cid: CID, parentKey: Maybe<string>): Promise<Result> => {
  const links = await protocol.getLinks(cid, parentKey)
  const [metadata, skeleton, children, key, size] = await Promise.all([
    protocol.getAndCheckValue(links, 'metadata', parentKey, check.isMetadata),
    protocol.getAndCheckValue(links, 'skeleton', parentKey, check.isSkeleton),
    protocol.getAndCheckValue(links, 'children', parentKey, check.isChildren),
    protocol.getAndCheckValue(links, 'key', parentKey, isString, true),
    ipfs.size(cid),
  ])

  const userland = links['userland']?.cid || null
  if(!check.isCID(userland)) throw new Error("Could not find userland")

  const { name, isFile, mtime, ctime, version } = metadata
  return {
    userland,
    header: { name, isFile, mtime, ctime, size, version, key, skeleton, children }
  }
}
