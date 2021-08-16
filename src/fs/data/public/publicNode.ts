import { CID } from "ipfs-core"
import { linksToCID, linksFromCID, lazyLinksToCID, lazyLinksFromCID } from "../links.js"
import { metadataToCID, metadataFromCID, Metadata, emptyDirectory } from "../metadata.js"
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



//--------------------------------------
// Operations
//--------------------------------------


export function isPublicFile(node: PublicNode): node is PublicFile {
  return node.metadata.isFile
}

export function isPublicDirectory(node: PublicNode): node is PublicDirectory {
  return !node.metadata.isFile
}

function isNonEmpty(paths: string[]): paths is [string, ...string[]] {
  return paths.length > 0
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

export interface Timestamp {
  now: number
}

// TODO: Split out the "create previous entries" thingie into its own recursive thing.
// and don't call it from within mkdir/write/etc.
// This is cool because (1) it won't have to iterate the whole tree, it can look for CID changes
// and (2) it's not complicating the mkdir functions anymore and
// (3) there's no duplicate effort when comparing the previous pointer _every time_
export async function mkdir(
  path: [string, ...string[]],
  directory: PublicDirectory,
  referenceForHistory: PublicDirectory | null,
  ctx: OperationContext & Timestamp
): Promise<PublicDirectory> {

  const [head, ...rest] = path

  const existing = await lookupNode(head, directory, ctx)

  if (existing != null && isPublicFile(existing)) {
    throw new Error("mkdir: There is already a file at this position")
  }

  if (!isNonEmpty(rest)) {
    if (existing != null) {
      // There already exists a directory with this name
      return directory
    }

    return await updatePreviousPointer(
      {
        ...directory,
        userland: {
          ...directory.userland,
          [head]: lazyRefFromObj({
            metadata: emptyDirectory(ctx.now),
            userland: {}
          }, directoryToCID)
        }
      },
      referenceForHistory,
      ctx
    )
  }

  const nextDirectory = existing == null ?
    {
      metadata: emptyDirectory(ctx.now),
      userland: {}
    } :
    existing

  const referenceNextDirectory = referenceForHistory == null ? null : await lookupDirectory(head, referenceForHistory, ctx)

  const changedDirectory = await mkdir(rest, nextDirectory, referenceNextDirectory, ctx)

  return await updatePreviousPointer(
    {
      ...directory,
      userland: {
        ...directory.userland,
        [head]: lazyRefFromObj(changedDirectory, directoryToCID)
      }
    },
    referenceForHistory,
    ctx
  )
}

export async function write(
  path: [string, ...string[]],
  content: PublicFile,
  directory: PublicDirectory,
  referenceForHistory: PublicDirectory | null,
  ctx: OperationContext
): Promise<PublicDirectory> {
  const [head, ...rest] = path
  if (!isNonEmpty(rest)) {
    return await updatePreviousPointer(
      {
        ...directory,
        userland: {
          ...directory.userland,
          [head]: lazyRefFromObj(content, fileToCID)
        }
      },
      referenceForHistory,
      ctx
    )
  }

  const nextDirectory = await lookupDirectory(head, directory, ctx)
  if (nextDirectory == null) {
    throw new Error("Path does not exist")
  }

  const referenceNextDirectory = referenceForHistory == null ? null : await lookupDirectory(head, referenceForHistory, ctx)

  const changedDirectory = await write(rest, content, nextDirectory, referenceNextDirectory, ctx)

  return await updatePreviousPointer(
    {
      ...directory,
      userland: {
        ...directory.userland,
        [head]: lazyRefFromObj(changedDirectory, directoryToCID)
      }
    },
    referenceForHistory,
    ctx
  )
}

/**
 * This function implements a crucial part of building history:
 * Updating the 'previous' pointer on a PublicDirectory that was
 * recently created with updated contents ('mutated' in immutable data).
 * For that, we keep around the original, unmodified directory (reference)
 * and compare the reference to the current state of the directory.
 * If we see that directory.previous equals reference.previous, then
 * we have to update directory's previous pointer to point to reference.
 * Otherwise we've already made that connection.
 */
async function updatePreviousPointer(directory: PublicDirectory, reference: PublicDirectory | null, ctx: OperationContext): Promise<PublicDirectory> {
  if (reference == null) return directory

  const previous = directory.previous

  if (previous == null) {
    // We create the first history entry for this node
    return {
      ...directory,
      previous: lazyRefFromObj(reference, directoryToCID)
    }
  }

  const refPrevious = reference.previous
  if (refPrevious == null) return directory // an argument where this is happens is actually not supposed to be provided

  const previousCID = await previous.ref(ctx)
  const refPreviousCID = await refPrevious.ref(ctx)

  if (previousCID.equals(refPreviousCID)) {
    return {
      ...directory,
      previous: lazyRefFromObj(reference, directoryToCID)
    }
  }

  // we already created the history entry
  return directory
}

async function lookupNode(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicNode | null> {
  return await dir.userland[path]?.get(ctx)
}

async function lookupDirectory(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicDirectory | null> {
  const node = await lookupNode(path, dir, ctx)
  if (node == null || isPublicFile(node)) return null
  return node
}

async function lookupFile(path: string, dir: PublicDirectory, ctx: OperationContext): Promise<PublicFile | null> {
  const node = await lookupNode(path, dir, ctx)
  if (node == null || isPublicDirectory(node)) return null
  return node
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
