import { Link, Links, HeaderV1, IpfsSerialized, PutDetails, Metadata } from '../types'
import * as check from '../types/check'

import * as semver from '../semver'

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

export const put = async (
    userland: Link,
    info: Partial<IpfsSerialized>
  ): Promise<PutDetails> => {
  const [metadata, skeleton, children] = await Promise.all([
    putAndMakeLink('metadata', (info.metadata || emptyMetadata())),
    putAndMakeLink('skeleton', (info.skeleton || {})),
    putAndMakeLink('children', (info.children || {})),
  ])
  const links = { metadata, skeleton, children, userland } as Links
  const { cid, size } = await protocol.putLinks(links)
  return { cid, userland: userland.cid, metadata: metadata.cid, size }
}

export const putAndMakeLink = async (name: string, val: FileContent) => {
  const { cid, size } = await ipfs.encoded.add(val, null)
  return link.make(name, cid, true, size)
}

export const getSerialized = async (cid: CID): Promise<IpfsSerialized> => {
  const links = await protocol.getLinks(cid)
  const [metadata, skeleton, children] = await Promise.all([
    protocol.getAndCheckValue(links, 'metadata', check.isMetadata),
    protocol.getAndCheckValue(links, 'skeleton', check.isSkeleton),
    protocol.getAndCheckValue(links, 'children', check.isChildren),
    ipfs.size(cid),
  ])

  const userland = links['userland']?.cid || null
  if(!check.isCID(userland)) throw new Error("Could not find userland")

  return { userland, metadata, skeleton, children }
}
