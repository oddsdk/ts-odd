import { CID } from "ipfs-core"
import { linksToCID, linksFromCID, lazyLinksToCID, lazyLinksFromCID } from "../links.js"
import { metadataToCID, metadataFromCID, Metadata, newDirectory, updateMtime, newFile } from "../metadata.js"
import { LazyCIDRef, lazyRefFromCID, lazyRefFromObj, OperationContext } from "../ref.js"


/**
 * Possible todo-s:
 * - A reconciliation algorithm on PublicDirectory
 * - A diffing algorithm which adds the correct "previous" links
 * - An algorithm for "write file"/"write directory", then possibly abstract to "run on tree"
 * - Modeling MMPT with LazyCIDRef, possibly moving on to modeling data behind encryption
 */

export interface PublicDirectory {
  metadata: Metadata
  userland: { [name: string]: LazyCIDRef<PublicNode> }
  skeleton?: CID
  previous?: LazyCIDRef<PublicDirectory>
}


export interface PublicFile {
  metadata: Metadata
  userland: CID
  previous?: LazyCIDRef<PublicFile>
}


export type PublicNode = PublicFile | PublicDirectory

export interface Timestamp {
  now: number
}


export function isPublicFile(node: PublicNode): node is PublicFile {
  return node.metadata.isFile
}

export function isPublicDirectory(node: PublicNode): node is PublicDirectory {
  return !node.metadata.isFile
}



//--------------------------------------
// Operations
//--------------------------------------


export async function read(
  path: [string, ...string[]],
  directory: PublicDirectory,
  ctx: OperationContext
): Promise<CID> {
  const node = await getNode(path, directory, ctx)

  if (node == null) throw new Error(`Couldn't read. No such file ${path}.`)
  if (isPublicDirectory(node)) throw new Error(`Couldn't read ${path}, it's a directory.`)

  return node.userland
}

export async function ls(
  path: [string, ...string[]],
  directory: PublicDirectory,
  ctx: OperationContext
): Promise<Record<string, Metadata>> {
  const node = await getNode(path, directory, ctx)

  if (node == null) throw new Error(`Couldn't ls. No such path ${path}.`)
  if (isPublicFile(node)) throw new Error(`Couldn't ls ${path}, it's a file.`)

  const result: Record<string, Metadata> = {}
  for (const [name, entry] of Object.entries(node.userland)) {
    result[name] = (await entry.get(ctx)).metadata
  }

  return result
}

export async function exists(path: [string, ...string[]],directory: PublicDirectory,ctx: OperationContext): Promise<boolean> {
  return await getNode(path, directory, ctx) != null
}

export async function write(
  path: [string, ...string[]],
  content: CID,
  directory: PublicDirectory,
  ctx: OperationContext & Timestamp
): Promise<PublicDirectory> {
  const dirPath = path.slice(0, path.length - 1)
  if (isNonEmpty(dirPath)) {
    directory = await mkdir(dirPath, directory, ctx)
  }
  return await upsert(
    path,
    async entry => {
      if (entry != null && isPublicDirectory(await entry.get(ctx))) {
        throw new Error(`Can't write file to ${path}: There already exists a directory.`)
      }
      return lazyRefFromObj({
        metadata: newFile(ctx.now),
        userland: content
      }, fileToCID)
    },
    directory,
    ctx
  )
}

export async function rm(
  path: [string, ...string[]],
  directory: PublicDirectory,
  ctx: OperationContext & Timestamp
): Promise<PublicDirectory> {
  return await upsert(
    path,
    async entry => {
      if (entry == null) {
        throw new Error(`Can't remove file or directory at ${path}: There is neither.`)
      }
      return null
    },
    directory,
    ctx
  )
}

export async function mkdir(
  path: [string, ...string[]],
  directory: PublicDirectory,
  ctx: OperationContext & Timestamp
): Promise<PublicDirectory> {

  const [name, ...restPath] = path

  const existing = await lookupNode(name, directory, ctx)

  if (existing != null && isPublicFile(existing)) {
    throw new Error("mkdir: There is already a file at this position")
  }

  if (!isNonEmpty(restPath)) {
    if (existing != null) {
      // There already exists a directory with this name
      return directory
    }

    return {
      ...directory,
      userland: {
        ...directory.userland,
        [name]: lazyRefFromObj({
          metadata: newDirectory(ctx.now),
          userland: {}
        }, directoryToCID)
      }
    }
  }

  const nextDirectory = existing == null ?
    {
      metadata: newDirectory(ctx.now),
      userland: {}
    } :
    existing

  const changedDirectory = await mkdir(restPath, nextDirectory, ctx)

  return {
    ...directory,
    userland: {
      ...directory.userland,
      [name]: lazyRefFromObj(changedDirectory, directoryToCID)
    }
  }
}

export async function upsert(
  path: [string, ...string[]],
  update: (entry: LazyCIDRef<PublicNode> | null) => Promise<LazyCIDRef<PublicNode> | null>,
  directory: PublicDirectory,
  ctx: OperationContext & Timestamp
): Promise<PublicDirectory> {
  const [name, ...restPath] = path

  if (!isNonEmpty(restPath)) {
    const updated = await update(directory.userland[name] || null)
    const userland = { ...directory.userland }

    if (updated == null) {
      delete userland[name]
    } else {
      userland[name] = updated
    }

    return {
      ...directory,
      metadata: updateMtime(directory.metadata, ctx.now),
      userland
    }
  }

  const nextDirectory = await lookupDirectory(name, directory, ctx)
  if (nextDirectory == null) {
    throw new Error("Path does not exist")
  }

  const changedDirectory = await upsert(restPath, update, nextDirectory, ctx)

  return {
    ...directory,
    metadata: updateMtime(directory.metadata, ctx.now),
    userland: {
      ...directory.userland,
      [name]: lazyRefFromObj(changedDirectory, directoryToCID)
    }
  }
}

export async function getNode(
  path: [string, ...string[]],
  directory: PublicDirectory,
  ctx: OperationContext
): Promise<PublicNode | null> {
  const [head, ...rest] = path
  if (!isNonEmpty(rest)) {
    return await lookupNode(head, directory, ctx)
  }

  const nextDirectory = await lookupDirectory(head, directory, ctx)
  if (nextDirectory == null) return null

  return await getNode(rest, nextDirectory, ctx)
}


export async function lookupNode(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicNode | null> {
  return await dir.userland[path]?.get(ctx)
}

export async function lookupDirectory(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicDirectory | null> {
  const node = await lookupNode(path, dir, ctx)
  if (node == null || isPublicFile(node)) return null
  return node
}

export async function lookupFile(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicFile | null> {
  const node = await lookupNode(path, dir, ctx)
  if (node == null || isPublicDirectory(node)) return null
  return node
}



//--------------------------------------
// History
//--------------------------------------


export async function enumerateHistory(file: PublicFile, ctx: OperationContext): Promise<PublicFile[]>
export async function enumerateHistory(directory: PublicDirectory, ctx: OperationContext): Promise<PublicDirectory[]>
export async function enumerateHistory(node: PublicNode, ctx: OperationContext): Promise<PublicNode[]>
export async function enumerateHistory(node: PublicNode, ctx: OperationContext): Promise<PublicNode[]> {
  if (isPublicFile(node)) {
    const previous = await node.previous?.get(ctx)
    if (previous == null) return [node]
    return [node, ...await enumerateHistory(previous, ctx)]
  } else { // *sigh*
    const previous = await node.previous?.get(ctx)
    if (previous == null) return [node]
    return [node, ...await enumerateHistory(previous, ctx)]
  }
}

export async function baseHistoryOn(
  directory: PublicDirectory,
  historyBase: PublicDirectory,
  ctx: OperationContext
): Promise<PublicDirectory> {
  const userland: Record<string, LazyCIDRef<PublicNode>> = {}

  for (const [name, entry] of Object.entries(directory.userland)) {
    const baseEntry = historyBase.userland[name]
    userland[name] = baseEntry == null ? entry : await baseHistoryOnHelper(entry, baseEntry, ctx)
  }

  return {
    ...directory,
    userland,
    previous: lazyRefFromObj(historyBase, directoryToCID)
  }
}

async function baseHistoryOnHelper(
  nodeRef: LazyCIDRef<PublicNode>,
  historyBaseRef: LazyCIDRef<PublicNode>,
  ctx: OperationContext
): Promise<LazyCIDRef<PublicNode>> {
  const nodeCID = await nodeRef.ref(ctx)
  const baseCID = await historyBaseRef.ref(ctx)
  if (nodeCID.equals(baseCID)) {
    return nodeRef
  }

  const node = await nodeRef.get(ctx)
  const base = await historyBaseRef.get(ctx)

  if (isPublicFile(node)) {
    if (!isPublicFile(base)) return nodeRef

    return lazyRefFromObj({
      ...node,
      previous: lazyRefFromObj(base, fileToCID)
    }, fileToCID)
  }

  if (!isPublicDirectory(base)) return nodeRef

  const userland: Record<string, LazyCIDRef<PublicNode>> = {}

  for (const [name, entry] of Object.entries(node.userland)) {
    const baseEntry = base.userland[name]
    userland[name] = baseEntry == null ? entry : await baseHistoryOnHelper(entry, baseEntry, ctx)
  }

  return lazyRefFromObj({
    ...node,
    userland,
    previous: historyBaseRef as LazyCIDRef<PublicDirectory> // we've checked it's a directory above
  }, directoryToCID)
}



//--------------------------------------
// Persistence
//--------------------------------------


export async function nodeToCID(node: PublicNode, ctx: OperationContext): Promise<CID> {
  if (isPublicDirectory(node)) {
    return await directoryToCID(node, ctx)
  } else {
    return await fileToCID(node, ctx)
  }
}

export async function directoryToCID(dir: PublicDirectory, ctx: OperationContext): Promise<CID> {
  const links: Record<string, CID> = {
    metadata: await metadataToCID(dir.metadata, ctx),
    userland: await lazyLinksToCID(dir.userland, ctx),
  }
  if (dir.skeleton != null) [
    links.skeleton = dir.skeleton
  ]
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

  const result: PublicDirectory = {
    metadata: metadata,
    userland: await lazyLinksFromCID(dirLinks.userland, nodeFromCID, ctx)
  }

  if (dirLinks.skeleton != null) {
    result.skeleton = dirLinks.skeleton
  }

  if (dirLinks.previous != null) {
    result.previous = lazyRefFromCID(dirLinks.previous, directoryFromCID)
  }

  return Object.freeze(result)
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

  return Object.freeze(result)
}



//--------------------------------------
// Utilities
//--------------------------------------


function isNonEmpty(paths: string[]): paths is [string, ...string[]] {
  return paths.length > 0
}
