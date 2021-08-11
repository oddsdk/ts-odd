import { CID } from "ipfs-core"
import { linksToCID, linksFromCID, UnixFSLink, linkFromCID, lazyLinksToCID, lazyLinksFromCID } from "../links.js"
import { metadataToCID, metadataFromCID, Metadata } from "../metadata.js"
import { LazyCIDRef, lazyRefFromCID, PersistenceOptions } from "../ref.js"


export interface PublicDirectory {
  metadata: UnixFSLink<Metadata>
  skeleton: UnixFSLink<CID>
  userland: UnixFSLink<{
    [key: string]: UnixFSLink<LazyCIDRef<PublicDirectory | PublicFile>>
  }>
  previous?: UnixFSLink<LazyCIDRef<PublicDirectory>>
}


export interface PublicFile {
  metadata: UnixFSLink<Metadata>
  userland: UnixFSLink<CID> // TODO: Decide whether this should become something like LazyCIDRef<Uint8Array> at some point maybe?
  previous?: UnixFSLink<LazyCIDRef<PublicFile>>
}


export async function directoryToCID(dir: PublicDirectory, options: PersistenceOptions): Promise<CID> {
  return await linksToCID({
    metadata: await linkFromCID(await metadataToCID(dir.metadata.link, options), options),
    skeleton: dir.skeleton,
    userland: await linkFromCID(await lazyLinksToCID(dir.userland.link, options), options)
  }, options)
}

export async function nodeFromCID(cid: CID, options: PersistenceOptions): Promise<PublicDirectory | PublicFile> {
  const dirLinks = await linksFromCID(cid, options)
  if (dirLinks.metadata == null) throw new Error(`Missing link "metadata" for PublicDirectory or PublicFile at ${cid.toString()}`)

  const metadata = await metadataFromCID(dirLinks.metadata.link, options)
  
  if (metadata.isFile) {
    return await directoryFromLinksHelper(cid, dirLinks, metadata, options)
  } else {
    return await fileFromLinksHelper(cid, dirLinks, metadata)
  }
}

export async function directoryFromCID(cid: CID, options: PersistenceOptions): Promise<PublicDirectory> {
  const node = await nodeFromCID(cid, options)
  if (node.metadata.link.isFile) {
    throw new Error(`Expected a PublicDirectory at ${cid.toString()}, but got a PublicFile instead.`)
  }
  return node as PublicDirectory
}

export async function fileFromCID(cid: CID, options: PersistenceOptions): Promise<PublicFile> {
  const node = await nodeFromCID(cid, options)
  if (!node.metadata.link.isFile) {
    throw new Error(`Expected a PublicFile at ${cid.toString()}, but got a PublicDirectory instead.`)
  }
  return node as PublicFile
}


async function directoryFromLinksHelper(cid: CID, dirLinks: Record<string, UnixFSLink<CID>>, metadata: Metadata, options: PersistenceOptions): Promise<PublicDirectory> {
  if (dirLinks.userland == null) throw new Error(`Missing link "userland" for PublicDirectory at ${cid.toString()}`)
  if (dirLinks.skeleton == null) throw new Error(`Missing link "skeleton" for PublicDirectory at ${cid.toString()}`)

  const userlandLinks = await lazyLinksFromCID(dirLinks.userland.link, nodeFromCID, options)

  const result = {
    skeleton: dirLinks.skeleton,
    metadata: {
      link: metadata,
      size: dirLinks.metadata.size
    },
    userland: {
      link: userlandLinks,
      size: dirLinks.userland.size
    },
  }

  if (dirLinks.previous != null) {
    const previous = lazyRefFromCID(dirLinks.previous.link, directoryFromCID)
    return {
      ...result,
      previous: {
        link: previous,
        size: dirLinks.previous.size,
      }
    }
  }
  return result
}

async function fileFromLinksHelper(cid: CID, dirLinks: Record<string, UnixFSLink<CID>>, metadata: Metadata): Promise<PublicFile> {
  if (dirLinks.userland == null) throw new Error(`Missing link "userland" for PublicFile at ${cid.toString()}`)

  return {
    metadata: {
      link: metadata,
      size: dirLinks.metadata.size
    },
    userland: dirLinks.userland
  }
}