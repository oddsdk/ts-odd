import { Link, Links, PutDetails, Metadata, TreeInfo, FileInfo, Skeleton, ChildrenMetadata } from '../types'
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

export const putTree = async (
    links: Links,
    skeletonVal: Skeleton,
    childrenVal: ChildrenMetadata,
    metadataVal: Metadata
  ): Promise<PutDetails> => {
  const userlandInfo = await protocol.putLinks(links)
  const userland = link.make('userland', userlandInfo.cid, true, userlandInfo.size)
  const [metadata, skeleton, children] = await Promise.all([
    putAndMakeLink('metadata', metadataVal),
    putAndMakeLink('skeleton', skeletonVal),
    putAndMakeLink('children', childrenVal),
  ])
  const internalLinks = { metadata, skeleton, children, userland } as Links
  const { cid, size } = await protocol.putLinks(internalLinks)
  return { cid, userland: userland.cid, metadata: metadata.cid, size }
}

export const putFile = async (
    content: FileContent,
    metadataVal: Metadata
  ): Promise<PutDetails> => {
  const userlandInfo = await protocol.putFile(content)
  const userland = link.make('userland', userlandInfo.cid, true, userlandInfo.size)
  const metadata = await putAndMakeLink('metadata', metadataVal)
  const internalLinks = { metadata, userland } as Links
  const { cid, size } = await protocol.putLinks(internalLinks)
  return { cid, userland: userland.cid, metadata: metadata.cid, size }
}

export const putAndMakeLink = async (name: string, val: FileContent) => {
  const { cid, size } = await ipfs.encoded.add(val, null)
  return link.make(name, cid, true, size)
}

export const get = async (cid: CID): Promise<TreeInfo | FileInfo> => {
  const links = await protocol.getLinks(cid)
  const metadata = await protocol.getAndCheckValue(links, 'metadata', check.isMetadata)
  let skeleton, children
  if(!metadata.isFile){
    [skeleton, children] = await Promise.all([
      protocol.getAndCheckValue(links, 'skeleton', check.isSkeleton),
      protocol.getAndCheckValue(links, 'children', check.isChildrenMetadata),
      ipfs.size(cid),
    ])
  }

  const userland = links['userland']?.cid || null
  if(!check.isCID(userland)) throw new Error("Could not find userland")

  return { userland, metadata, skeleton, children }
}
