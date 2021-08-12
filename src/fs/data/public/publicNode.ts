import { CID } from "ipfs-core"
import { linksToCID, linksFromCID, lazyLinksToCID, lazyLinksFromCID } from "../links.js"
import { metadataToCID, metadataFromCID, Metadata } from "../metadata.js"
import { LazyCIDRef, lazyRefFromCID, OperationContext } from "../ref.js"


/**
 * Possible todo-s:
 * - A reconciliation algorithm on PublicDirectory
 * - An algorithm for "write file"/"write directory", then possibly abstract to "run on tree"
 * - Modeling MMPT with LazyCIDRef, possibly moving on to modeling data behind encryption
 */

export interface PublicDirectory {
  metadata: Metadata
  skeleton: CID
  userland: { [name: string]: LazyCIDRef<PublicNode> }
  previous?: LazyCIDRef<PublicDirectory>
}


export interface PublicFile {
  metadata: Metadata
  userland: CID
  previous?: LazyCIDRef<PublicFile>
}


export type PublicNode = PublicFile | PublicDirectory



//--------------------------------------
// Operations
//--------------------------------------


export function isPublicFile(node: PublicNode): node is PublicFile {
  return node.metadata.isFile
}

export function isPublicDirectory(node: PublicNode): node is PublicDirectory {
  return !node.metadata.isFile
}


export async function write(path: [string, ...string[]], content: PublicFile, directory: PublicDirectory, ctx: OperationContext) {
  const [head, ...rest] = path
  if (rest.length === 0) {
    directory.userland
  }
}


//--------------------------------------
// Persistence
//--------------------------------------


export async function directoryToCID(dir: PublicDirectory, ctx: OperationContext): Promise<CID> {
  const links: Record<string, CID> = {
    metadata: await metadataToCID(dir.metadata, ctx),
    skeleton: dir.skeleton,
    userland: await lazyLinksToCID(dir.userland, ctx),
  }
  if (dir.previous != null) {
    links.previous = await dir.previous.ref(ctx)
  }
  return await linksToCID(links, ctx)
}

export async function fileToCID(file: PublicFile, ctx: OperationContext): Promise<CID> {
  const links: Record<string, CID> = {
    metadata: await metadataToCID(file.metadata, ctx),
    userland: file.userland,
  }
  if (file.previous != null) {
    links.previous = await file.previous.ref(ctx)
  }
  return await linksToCID(links, ctx)
}


export async function nodeFromCID(cid: CID, ctx: OperationContext): Promise<PublicNode> {
  const dirLinks = await linksFromCID(cid, ctx)
  if (dirLinks.metadata == null) throw new Error(`Missing link "metadata" for PublicDirectory or PublicFile at ${cid.toString()}`)

  const metadata = await metadataFromCID(dirLinks.metadata, ctx)

  if (metadata.isFile) {
    return await fileFromLinksHelper(cid, dirLinks, metadata)
  } else {
    return await directoryFromLinksHelper(cid, dirLinks, metadata, ctx)
  }
}

// The following two functions *could* be faster by checking the metadata.isFile beforehand,
// but that'd only be faster in the failing case, so I don't think it's something worth optimizing for

export async function directoryFromCID(cid: CID, ctx: OperationContext): Promise<PublicDirectory> {
  const node = await nodeFromCID(cid, ctx)
  if (node.metadata.isFile) {
    throw new Error(`Expected a PublicDirectory at ${cid.toString()}, but got a PublicFile instead.`)
  }
  return node as PublicDirectory
}

export async function fileFromCID(cid: CID, ctx: OperationContext): Promise<PublicFile> {
  const node = await nodeFromCID(cid, ctx)
  if (!node.metadata.isFile) {
    throw new Error(`Expected a PublicFile at ${cid.toString()}, but got a PublicDirectory instead.`)
  }
  return node as PublicFile
}


async function directoryFromLinksHelper(cid: CID, dirLinks: Record<string, CID>, metadata: Metadata, ctx: OperationContext): Promise<PublicDirectory> {
  if (dirLinks.userland == null) throw new Error(`Missing link "userland" for PublicDirectory at ${cid.toString()}`)
  if (dirLinks.skeleton == null) throw new Error(`Missing link "skeleton" for PublicDirectory at ${cid.toString()}`)

  const result: PublicDirectory = {
    skeleton: dirLinks.skeleton,
    metadata: metadata,
    userland: await lazyLinksFromCID(dirLinks.userland, nodeFromCID, ctx)
  }

  if (dirLinks.previous != null) {
    result.previous = lazyRefFromCID(dirLinks.previous, directoryFromCID)
  }

  return result
}

async function fileFromLinksHelper(cid: CID, fileLinks: Record<string, CID>, metadata: Metadata): Promise<PublicFile> {
  if (fileLinks.userland == null) throw new Error(`Missing link "userland" for PublicFile at ${cid.toString()}`)

  const result: PublicFile = {
    metadata: metadata,
    userland: fileLinks.userland
  }

  if (fileLinks.previous != null) {
    result.previous = lazyRefFromCID(fileLinks.previous, fileFromCID)
  }

  return result
}
