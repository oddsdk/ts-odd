import { CID } from "multiformats/cid"
import { BlockStore } from "../blockStore.js"
import { AbortContext, isCID, isNonEmpty, Timestamp } from "../common.js"
import { linksToCID, linksFromCID, mapRecord } from "../links.js"
import { metadataToCID, metadataFromCID, Metadata, newDirectory, updateMtime, newFile } from "../metadata.js"


export type PublicNode = PublicFile | PublicDirectory

export type PublicDirectory = PublicDirectorySchema<PublicNode | CID>

export type PublicDirectoryPersisted = PublicDirectorySchema<CID>

export type PublicNodePersisted = PublicFile | PublicDirectoryPersisted

export interface PublicDirectorySchema<Link> {
  metadata: Metadata
  userland: { [name: string]: Link }
  skeleton?: CID
  previous?: CID
}


export interface PublicFile {
  metadata: Metadata
  userland: CID
  previous?: CID
}


export type OperationContext = AbortContext & BlockStore


export function isPublicFile(node: PublicNode): node is PublicFile {
  return node.metadata.isFile
}

export function isPublicDirectory(node: PublicNode): node is PublicDirectory {
  return !node.metadata.isFile
}



export async function resolveLink(link: PublicNode | CID, ctx: OperationContext): Promise<PublicNode> {
  if (isCID(link)) {
    return await nodeFromCID(link, ctx)
  }
  return link
}

export async function sealLink(link: PublicNode | CID, ctx: OperationContext): Promise<CID> {
  if (isCID(link)) {
    return link
  }
  return await nodeToCID(link, ctx)
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
  if (!isPublicFile(node)) throw new Error(`Couldn't read ${path}, it's not a file.`)

  return node.userland
}

export async function ls(
  path: string[],
  directory: PublicDirectory,
  ctx: OperationContext
): Promise<Record<string, Metadata>> {
  const node = isNonEmpty(path) ? await getNode(path, directory, ctx) : directory

  if (node == null) throw new Error(`Couldn't ls. No such path ${path}.`)
  if (isPublicFile(node)) throw new Error(`Couldn't ls ${path}, it's a file.`)

  const result: Record<string, Metadata> = {}
  for (const [name, entry] of Object.entries(node.userland)) {
    result[name] = (await resolveLink(entry, ctx)).metadata
  }

  return result
}

export async function exists(path: [string, ...string[]], directory: PublicDirectory, ctx: OperationContext): Promise<boolean> {
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
      if (entry != null) {
        const file = await resolveLink(entry, ctx)
        if (isPublicDirectory(file)) {
          throw new Error(`Can't write file to ${path}: There already exists a directory.`)
        }
        return {
          ...file,
          metadata: updateMtime(file.metadata, ctx.now),
          userland: content
        }
      }
      return {
        metadata: newFile(ctx.now),
        userland: content
      }
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
        [name]: {
          metadata: newDirectory(ctx.now),
          userland: {}
        }
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
      [name]: changedDirectory
    }
  }
}

export async function mv(
  from: [string, ...string[]],
  to: [string, ...string[]],
  directory: PublicDirectory,
  ctx: OperationContext & Timestamp
): Promise<PublicDirectory> {
  let nodeToInsert: null | PublicNode = null
  directory = await upsert(from, async entry => {
    if (entry == null) {
      throw new Error(`Can't mv from ${from} to ${to}. ${from} doesn't exist.`)
    }
    nodeToInsert = await resolveLink(entry, ctx)
    return null
  }, directory, ctx)

  const toDir = to.slice(0, -1)
  if (isNonEmpty(toDir)) {
    if (!await exists(toDir, directory, ctx)) {
      directory = await mkdir(toDir, directory, ctx)
    }
  }

  return await upsert(to, async entry => {
    // alternative implementation: Unix behavior?
    // I.e. if entry is a directory, add it under that directory using last(from) as name?
    if (entry != null) {
      throw new Error(`Can't mv from ${from} to ${to}. ${to} already exists. ${toDir}`)
    }
    return nodeToInsert
  }, directory, ctx)
}

export async function upsert(
  path: [string, ...string[]],
  update: (entry: PublicNode | CID | null) => Promise<PublicNode | CID | null>,
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
      [name]: changedDirectory
    }
  }
}

export async function getNode(
  path: [string, ...string[]],
  directory: PublicDirectory,
  ctx: OperationContext
): Promise<PublicNode | null> {
  const [head, ...rest] = path
  const nextNode = await lookupNode(head, directory, ctx)

  if (!isNonEmpty(rest)) {
    return nextNode
  }

  if (nextNode == null || isPublicFile(nextNode)) {
    return null
  }

  return await getNode(rest, nextNode, ctx)
}


export async function lookupNode(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicNode | null> {
  return dir.userland[path] != null ? await resolveLink(dir.userland[path], ctx) : null
}

export async function lookupDirectory(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicDirectory | null> {
  const node = await lookupNode(path, dir, ctx)
  if (node == null || !isPublicDirectory(node)) return null
  return node
}

export async function lookupFile(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicFile | null> {
  const node = await lookupNode(path, dir, ctx)
  if (node == null || !isPublicFile(node)) return null
  return node
}



//--------------------------------------
// History
//--------------------------------------


export async function enumerateHistory(file: PublicFile, ctx: OperationContext): Promise<PublicFile[]>
export async function enumerateHistory(directory: PublicDirectory, ctx: OperationContext): Promise<PublicDirectory[]>
export async function enumerateHistory(node: PublicNode, ctx: OperationContext): Promise<PublicNode[]>
export async function enumerateHistory(node: PublicNode, ctx: OperationContext): Promise<PublicNode[]> {
  if (node.previous == null) return [node]
  return [node, ...await enumerateHistory(await nodeFromCID(node.previous, ctx), ctx)]
}

export async function baseHistoryOn(
  directory: PublicDirectory,
  historyBase: PublicDirectory,
  ctx: OperationContext
): Promise<PublicDirectory> {
  const userland: Record<string, PublicNode | CID> = {}

  for (const [name, entry] of Object.entries(directory.userland)) {
    const baseEntry = historyBase.userland[name]
    userland[name] = baseEntry == null ? entry : await baseHistoryOnHelper(entry, baseEntry, ctx)
  }

  return {
    ...directory,
    userland,
    previous: await nodeToCID(historyBase, ctx)
  }
}

async function baseHistoryOnHelper(
  nodeRef: PublicNode | CID,
  historyBaseRef: PublicNode | CID,
  ctx: OperationContext
): Promise<PublicNode | CID> {
  const nodeCID = isCID(nodeRef) ? nodeRef : await nodeToCID(nodeRef, ctx)
  const baseCID = isCID(historyBaseRef) ? historyBaseRef : await nodeToCID(historyBaseRef, ctx)
  if (nodeCID.equals(baseCID)) {
    return nodeRef
  }

  const node = await resolveLink(nodeRef, ctx)
  const base = await resolveLink(historyBaseRef, ctx)

  if (isPublicFile(node)) {
    if (!isPublicFile(base)) return nodeRef

    return {
      ...node,
      previous: await nodeToCID(base, ctx)
    }
  }

  if (!isPublicDirectory(base)) return nodeRef

  const userland: Record<string, PublicNode | CID> = {}

  for (const [name, entry] of Object.entries(node.userland)) {
    const baseEntry = base.userland[name]
    userland[name] = baseEntry == null ? entry : await baseHistoryOnHelper(entry, baseEntry, ctx)
  }

  return {
    ...node,
    userland,
    previous: baseCID
  }
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
    userland: await linksToCID(await mapRecord(dir.userland, (_, link) => sealLink(link, ctx)), ctx),
  }
  if (dir.skeleton != null) [
    links.skeleton = dir.skeleton
  ]
  if (dir.previous != null) {
    links.previous = dir.previous
  }
  return await linksToCID(links, ctx)
}

export async function fileToCID(file: PublicFile, ctx: OperationContext): Promise<CID> {
  const links: Record<string, CID> = {
    metadata: await metadataToCID(file.metadata, ctx),
    userland: file.userland,
  }
  if (file.previous != null) {
    links.previous = file.previous
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
    userland: await linksFromCID(dirLinks.userland, ctx)
  }

  if (dirLinks.skeleton != null) {
    result.skeleton = dirLinks.skeleton
  }

  if (dirLinks.previous != null) {
    result.previous = dirLinks.previous
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
    result.previous = fileLinks.previous
  }

  return Object.freeze(result)
}
