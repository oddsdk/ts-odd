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
  const links: Record<string, UnixFSLink<CID>> = {
    metadata: await linkFromCID(await metadataToCID(dir.metadata.data, options), options),
    skeleton: dir.skeleton,
    userland: await linkFromCID(await lazyLinksToCID(dir.userland.data, options), options)
  }
  if (dir.previous != null) {
    links.previous = await linkFromCID(await dir.previous.data.ref(options), options)
  }
  return await linksToCID(links, options)
}

export async function fileToCID(file: PublicFile, options: PersistenceOptions): Promise<CID> {
  const links: Record<string, UnixFSLink<CID>> = {
    metadata: await linkFromCID(await metadataToCID(file.metadata.data, options), options),
    userland: file.userland,
  }
  if (file.previous != null) {
    links.previous = await linkFromCID(await file.previous.data.ref(options), options)
  }
  return await linksToCID(links, options)
}

export async function nodeFromCID(cid: CID, options: PersistenceOptions): Promise<PublicDirectory | PublicFile> {
  const dirLinks = await linksFromCID(cid, options)
  if (dirLinks.metadata == null) throw new Error(`Missing link "metadata" for PublicDirectory or PublicFile at ${cid.toString()}`)

  const metadata = await metadataFromCID(dirLinks.metadata.data, options)

  if (metadata.isFile) {
    return await fileFromLinksHelper(cid, dirLinks, metadata)
  } else {
    return await directoryFromLinksHelper(cid, dirLinks, metadata, options)
  }
}

// The following two functions *could* be faster by checking the metadata.isFile beforehand,
// but that'd only be faster in the failing case, so I don't think it's something worth optimizing for

export async function directoryFromCID(cid: CID, options: PersistenceOptions): Promise<PublicDirectory> {
  const node = await nodeFromCID(cid, options)
  if (node.metadata.data.isFile) {
    throw new Error(`Expected a PublicDirectory at ${cid.toString()}, but got a PublicFile instead.`)
  }
  return node as PublicDirectory
}

export async function fileFromCID(cid: CID, options: PersistenceOptions): Promise<PublicFile> {
  const node = await nodeFromCID(cid, options)
  if (!node.metadata.data.isFile) {
    throw new Error(`Expected a PublicFile at ${cid.toString()}, but got a PublicDirectory instead.`)
  }
  return node as PublicFile
}


async function directoryFromLinksHelper(cid: CID, dirLinks: Record<string, UnixFSLink<CID>>, metadata: Metadata, options: PersistenceOptions): Promise<PublicDirectory> {
  if (dirLinks.userland == null) throw new Error(`Missing link "userland" for PublicDirectory at ${cid.toString()}`)
  if (dirLinks.skeleton == null) throw new Error(`Missing link "skeleton" for PublicDirectory at ${cid.toString()}`)

  const userlandLinks = await lazyLinksFromCID(dirLinks.userland.data, nodeFromCID, options)

  const result: PublicDirectory = {
    skeleton: dirLinks.skeleton,
    metadata: {
      data: metadata,
      size: dirLinks.metadata.size
    },
    userland: {
      data: userlandLinks,
      size: dirLinks.userland.size
    },
  }

  if (dirLinks.previous != null) {
    result.previous = {
      data: lazyRefFromCID(dirLinks.previous.data, directoryFromCID),
      size: dirLinks.previous.size
    }
  }

  return result
}

async function fileFromLinksHelper(cid: CID, fileLinks: Record<string, UnixFSLink<CID>>, metadata: Metadata): Promise<PublicFile> {
  if (fileLinks.userland == null) throw new Error(`Missing link "userland" for PublicFile at ${cid.toString()}`)

  const result: PublicFile = {
    metadata: {
      data: metadata,
      size: fileLinks.metadata.size
    },
    userland: fileLinks.userland
  }

  if (fileLinks.previous != null) {
    result.previous = {
      data: lazyRefFromCID(fileLinks.previous.data, fileFromCID),
      size: fileLinks.previous.size
    }
  }

  return result
}