import * as cbor from "cborg"
import * as uint8arrays from "uint8arrays"

import * as metadata from "../metadata.js"
import { AbortContext, hasProp, isNonEmpty, isRecord, Timestamp } from "../common.js"
import * as bloom from "./bloomfilter.js"
import * as namefilter from "./namefilter.js"
import * as ratchet from "./spiralratchet.js"
import { crypto } from "./webcrypto.js"


export type PrivateNode = PrivateDirectory | PrivateFile

export type PrivateDirectory = PrivateDirectorySchema<PrivateNode | PrivateRef>

export type PrivateNodePersisted = PrivateDirectoryPersisted | PrivateFile

export type PrivateDirectoryPersisted = PrivateDirectorySchema<PrivateRef>

export interface PrivateDirectorySchema<Links> {
  metadata: metadata.Metadata
  bareName: bloom.BloomFilter
  revision: ratchet.SpiralRatchet
  links: {
    // we support storing `PrivateNode`s here directly so
    // we can quickly construct private filesystem structures
    // without side effects like polluting the ipfs blockstore or
    // having to advance ratchets/do encryption, etc.
    [path: string]: Links
  }
}

export interface PrivateFile {
  metadata: metadata.Metadata
  bareName: bloom.BloomFilter
  revision: ratchet.SpiralRatchet // so anyone reading this can fetch newer versions
  content: Uint8Array // TODO: Support non-inline content
}

export interface PrivateRef {
  key: Uint8Array // 32bit AES key
  algorithm: "AES-GCM" // only supported algorithm right now
  namefilter: bloom.BloomFilter
}

export interface PrivateStoreLookup {
  getBlock(ref: PrivateRef, ctx: AbortContext): Promise<Uint8Array | null>
}

export interface PrivateStore extends PrivateStoreLookup {
  putBlock(ref: PrivateRef, block: Uint8Array, ctx: AbortContext): Promise<void>
}

export interface RatchetStoreLookup {
  getOldestKnownRatchet(bareName: bloom.BloomFilter): ratchet.SpiralRatchet
}

export interface RatchetStore extends RatchetStoreLookup {
  observedRatchet(bareName: bloom.BloomFilter, ratchet: ratchet.SpiralRatchet): void
}

export interface PrivateConfig {
  ratchetDisparityBudget(): number
}

export type PrivateOperationContext = PrivateConfig & PrivateStoreLookup & RatchetStoreLookup & AbortContext


export function isPrivateFile(node: PrivateNode): node is PrivateFile {
  return node.metadata.isFile
}

export function isPrivateDirectory(node: PrivateNode): node is PrivateDirectory {
  return !node.metadata.isFile
}

export function isPrivateRef(ref: unknown): ref is PrivateRef {
  if (!hasProp(ref, "key") || !(ref.key instanceof Uint8Array)) return false
  if (!hasProp(ref, "algorithm") || ref.algorithm !== "AES-GCM") return false
  if (!hasProp(ref, "namefilter") || !(ref.namefilter instanceof Uint8Array)) return false
  return true
}


//--------------------------------------
// Persistence
//--------------------------------------


function nodeToCbor(node: PrivateNodePersisted): Uint8Array {
  return isPrivateFile(node) ? fileToCbor(node) : directoryToCbor(node)
}

function fileToCbor(file: PrivateFile): Uint8Array {
  return cbor.encode({
    metadata: file.metadata,
    bareName: file.bareName,
    revision: ratchet.toCborForm(file.revision),
    content: file.content
  })
}

function directoryToCbor(directory: PrivateDirectoryPersisted): Uint8Array {
  return cbor.encode({
    metadata: directory.metadata,
    bareName: directory.bareName,
    revision: ratchet.toCborForm(directory.revision),
    links: directory.links,
  })
}

function nodeFromCbor(bytes: Uint8Array): PrivateNodePersisted {
  const node = cbor.decode(bytes)

  const error = (msg: string) => new Error(`Couldn't parse private node. ${msg}. Got ${JSON.stringify(node, null, 2)}`)

  if (!hasProp(node, "metadata")) throw error("Missing key 'metadata'")
  if (!metadata.isMetadata(node.metadata)) throw error("Key 'metadata' invalid")

  if (!hasProp(node, "bareName")) throw error("Missing key 'bareName'")
  if (!(node.bareName instanceof Uint8Array)) throw error("Expected 'bareName' to be a byte array")
  if (node.bareName.length != bloom.wnfsParameters.mBytes) throw error(`'bareName' has invalid length (${node.bareName.length})`)

  if (!hasProp(node, "revision")) throw error("Missing key 'revision'")
  node.revision = ratchet.fromCborForm(node.revision)

  if (node.metadata.isFile) {
    if (!hasProp(node, "content")) throw error("Missing key 'content' for file")
    if (!(node.content instanceof Uint8Array)) throw error("Expected 'content' to be a byte array")

    return node as PrivateFile
  } else {
    if (!hasProp(node, "links")) throw error("Missing key 'links' for directory")
    if (!isRecord(node.links)) throw error("Expected key 'links' to be a record")
    const links: Record<string, PrivateRef> = {}
    for (const [name, ref] of Object.entries(node.links)) {
      if (!isPrivateRef(ref)) throw error(`Expected key 'links.${name}' to be a privateRef but got ${JSON.stringify(ref, null, 2)} (possibly an unsupported encryption algorithm?)`)
      links[name] = ref
    }
    node.links = links
    return node as PrivateDirectoryPersisted
  }
}

async function privateRefFor(node: { revision: ratchet.SpiralRatchet; bareName: bloom.BloomFilter }): Promise<PrivateRef> {
  const key = await ratchet.toKey(node.revision)
  return {
    key: new Uint8Array(key),
    algorithm: "AES-GCM",
    namefilter: await namefilter.saturate(await namefilter.addToBare(node.bareName, key))
  }
}

async function storedDirectoryWith(directory: PrivateDirectory, advanceNode: (node: PrivateNode) => Promise<PrivateNode>, ctx: PrivateStore & PrivateOperationContext): Promise<PrivateDirectoryPersisted> {
  const links: Record<string, PrivateRef> = {}
  for (const [name, link] of Object.entries(directory.links)) {
    links[name] = isPrivateRef(link) ? link : await storeNodeWith(link, advanceNode, ctx)
  }
  return { ...directory, links }
}

export async function storeNodeWith(node: PrivateNode, advanceNode: (node: PrivateNode) => Promise<PrivateNode>, ctx: PrivateStore & PrivateOperationContext): Promise<PrivateRef> {
  const advancedNode = await advanceNode(node)
  const storedNode = isPrivateDirectory(advancedNode) ? await storedDirectoryWith(advancedNode, advanceNode, ctx) : advancedNode
  const ref = await privateRefFor(storedNode)
  await ctx.putBlock(ref, nodeToCbor(storedNode), { signal: ctx.signal })
  return ref
}

export async function storeNodeAndAdvance(node: PrivateNode, ctx: PrivateStore & PrivateOperationContext): Promise<PrivateRef> {
  return await storeNodeWith(node, async node => ({
    ...node,
    revision: await ratchet.inc(node.revision)
  }), ctx)
}

export async function storeNode(node: PrivateNode, ctx: PrivateStore & PrivateOperationContext): Promise<PrivateRef> {
  return await storeNodeWith(node, async node => node, ctx)
}

export async function loadNode(ref: PrivateRef, ctx: PrivateOperationContext): Promise<PrivateNodePersisted> {
  const block = await ctx.getBlock(ref, { signal: ctx.signal })
  if (block == null) throw new Error(`No private block found at namefilter ${uint8arrays.toString(ref.namefilter, "base64url")}`)
  return nodeFromCbor(block)
}



//--------------------------------------
// Operations
//--------------------------------------


export async function newDirectory(parentBareFilter: bloom.BloomFilter, ctx: PrivateOperationContext & Timestamp): Promise<PrivateDirectory> {
  const revision = await ratchet.setup()
  const inumber = crypto.getRandomValues(new Uint8Array(32))
  const bareName = await namefilter.addToBare(parentBareFilter, inumber)
  return {
    metadata: metadata.newDirectory(ctx.now),
    revision,
    bareName,
    links: {}
  }
}

export async function newFile(parentBareFilter: bloom.BloomFilter, ctx: PrivateOperationContext & Timestamp): Promise<PrivateFile> {
  const revision = await ratchet.setup()
  const inumber = crypto.getRandomValues(new Uint8Array(32))
  const bareName = await namefilter.addToBare(parentBareFilter, inumber)
  return {
    metadata: metadata.newFile(ctx.now),
    revision,
    bareName,
    content: new Uint8Array([])
  }
}

export async function getNode(path: [string, ...string[]], directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<PrivateNode | null> {
  const [head, ...rest] = path
  const nextNode = await lookupNode(head, directory, ctx)

  if (!isNonEmpty(rest)) {
    return nextNode
  }

  if (nextNode == null || !isPrivateDirectory(nextNode)) {
    return null
  }

  return await getNode(rest, nextNode, ctx)
}

export async function getNodeSeeking(
  path: [string, ...string[]],
  directory: PrivateDirectory,
  ctx: PrivateOperationContext
): Promise<{ updated: PrivateDirectory; result: PrivateNode | null}> {
  const [head, ...rest] = path
  const nextNode = await lookupNodeSeeking(head, directory, ctx)

  if (nextNode == null) {
    return { updated: directory, result: null }
  }

  const updated = { ...directory, links: { ...directory.links, [head]: nextNode } }

  if (!isNonEmpty(rest)) {
    return { updated, result: nextNode }
  }

  if (!isPrivateDirectory(nextNode)) {
    return { updated, result: null }
  }

  return await getNodeSeeking(rest, nextNode, ctx)
}

async function lookupPrivateRef(ref: PrivateRef, ctx: PrivateOperationContext): Promise<PrivateNode | null> {
  const fetched = await ctx.getBlock(ref, { signal: ctx.signal })

  if (fetched == null) return null

  return nodeFromCbor(fetched)
}

export async function lookupNode(name: string, directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<PrivateNode | null> {
  const link = directory.links[name]

  if (link == null) return null

  return isPrivateRef(link) ? await lookupPrivateRef(link, ctx) : link
}

export async function lookupNodeSeeking(name: string, directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<PrivateNode | null> {
  const node = await lookupNode(name, directory, ctx)
  if (node == null) return null
  return await seekNode(node, ctx)
}

export async function seekNode(node: PrivateNode, ctx: PrivateOperationContext): Promise<PrivateNode> {
  const recent = await ratchet.seek(node.revision, async seek => await ctx.getBlock(await privateRefFor({
    revision: seek.ratchet,
    bareName: node.bareName,
  }), ctx) != null)
  // It's possible that the node we're seeking isn't actually persisted yet
  // because it might be from an intermediary state within a transaction.
  // If we tried to `loadNode` directly, then we'd fail finding such a node in the PrivateStore
  if (recent.increasedBy === 0) {
    return node
  }

  // TODO: There's duplicate work here. E.g. we're saturating the bloom filter twice. We're looking up the same private ref twice.
  return loadNode(await privateRefFor({
    revision: recent.ratchet,
    bareName: node.bareName
  }), ctx)
}

export function ensureDirectory(node: PrivateNode | null): PrivateDirectory | null {
  if (node == null || !isPrivateDirectory(node)) return null
  return node
}

export async function upsert(
  path: [string, ...string[]],
  update: (parentBareName: bloom.BloomFilter, entry: PrivateNode | PrivateRef | null) => Promise<PrivateNode | PrivateRef | null>,
  directory: PrivateDirectory,
  ctx: PrivateOperationContext & Timestamp
): Promise<PrivateDirectory> {
  const [name, ...restPath] = path

  if (!isNonEmpty(restPath)) {
    const updated = await update(directory.bareName, directory.links[name] || null)
    const links = { ...directory.links }

    if (updated == null) {
      delete links[name]
    } else {
      links[name] = updated
    }

    return {
      ...directory,
      metadata: metadata.updateMtime(directory.metadata, ctx.now),
      links
    }
  }

  const nextDirectory = ensureDirectory(await lookupNodeSeeking(name, directory, ctx))
  if (nextDirectory == null) {
    throw new Error("Path does not exist")
  }

  const changedDirectory = await upsert(restPath, update, nextDirectory, ctx)

  return {
    ...directory,
    metadata: metadata.updateMtime(directory.metadata, ctx.now),
    links: {
      ...directory.links,
      [name]: changedDirectory
    }
  }

}

export async function read(
  path: [string, ...string[]],
  directory: PrivateDirectory,
  ctx: PrivateOperationContext
): Promise<Uint8Array> {
  const node = await getNode(path, directory, ctx)

  if (node == null) throw new Error(`Couldn't read. No such file ${path}.`)
  if (!isPrivateFile(node)) throw new Error(`Couldn't read ${path}, it's not a file.`)

  return node.content
}

export async function readSeeking(
  path: [string, ...string[]],
  directory: PrivateDirectory,
  ctx: PrivateOperationContext
): Promise<{ updated: PrivateDirectory; result: Uint8Array }> {
  const { updated, result } = await getNodeSeeking(path, directory, ctx)

  if (result == null) throw new Error(`Couldn't read. No such file ${path}.`)
  if (!isPrivateFile(result)) throw new Error(`Couldn't read ${path}, it's not a file.`)

  return { updated, result: result.content }
}

export async function write(
  path: [string, ...string[]],
  content: Uint8Array,
  directory: PrivateDirectory,
  ctx: PrivateOperationContext & Timestamp
): Promise<PrivateDirectory> {
  const dirPath = path.slice(0, path.length - 1)
  if (isNonEmpty(dirPath)) {
    directory = await mkdir(dirPath, directory, ctx)
  }
  return await upsert(
    path,
    async (parentBareName, entry) => {
      entry = isPrivateRef(entry) ? await lookupPrivateRef(entry, ctx) : entry

      if (entry == null) {
        const file = await newFile(parentBareName, ctx)
        return { ...file, content }
      }

      if (isPrivateDirectory(entry)) {
        throw new Error(`Can't write file to ${path}: There already exists a directory.`)
      }

      return { ...entry, content }
    },
    directory,
    ctx
  )
}

export async function mkdir(
  path: [string, ...string[]],
  directory: PrivateDirectory,
  ctx: PrivateOperationContext & Timestamp
): Promise<PrivateDirectory> {

  const [name, ...restPath] = path

  const existing = await lookupNode(name, directory, ctx)

  if (existing != null && isPrivateFile(existing)) {
    throw new Error("mkdir: There is already a file at this position")
  }

  if (!isNonEmpty(restPath)) {
    if (existing != null) {
      // There already exists a directory with this name
      return directory
    }

    return {
      ...directory,
      links: {
        ...directory.links,
        [name]: await newDirectory(directory.bareName, ctx)
      }
    }
  }

  const nextDirectory = existing == null ? await newDirectory(directory.bareName, ctx) : existing

  const changedDirectory = await mkdir(restPath, nextDirectory, ctx)

  return {
    ...directory,
    links: {
      ...directory.links,
      [name]: changedDirectory
    }
  }
}


export async function* historyFor(
  path: string[],
  directory: PrivateDirectory,
  ctx: PrivateOperationContext
): AsyncGenerator<PrivateNode, void> {
  const oldestKnownRatchet = ctx.getOldestKnownRatchet(directory.bareName)
  // It's technically possible that we know older ratchets than what's in "getOldestKnownRatchet".
  // But we ignore this, because in most cases the stored ratchet is the oldest known ratchet.
  const rootPrevious = yieldBetween(directory.bareName, directory.revision, oldestKnownRatchet, ctx)

  if (!isNonEmpty(path)) {
    yield* rootPrevious
    return
  }

  yield* historyForHelper(path, rootPrevious, directory, ctx)
}


async function* historyForHelper(
  path: [string, ...string[]],
  previousViaParent: AsyncGenerator<PrivateNode, void>,
  directory: PrivateDirectory,
  ctx: PrivateOperationContext
): AsyncGenerator<PrivateNode, void> {
  const [head, ...rest] = path

  const next = await lookupNode(head, directory, ctx)

  if (next == null) {
    throw new Error(`Couldn't find file or directory ${head} at ${uint8arrays.toString(directory.bareName, "base64url")} when trying to list history.`)
  }

  const directoryEntryPrevious = previousOfDirectoryEntry(directory, head, previousViaParent, ctx)

  if (!isNonEmpty(rest)) {
    yield* previousFor(next, directoryEntryPrevious, ctx)
    return
  }

  if (!isPrivateDirectory(next)) {
    throw new Error(`Couldn't find a directory with name ${head} at ${uint8arrays.toString(directory.bareName, "base64url")} when trying to list history.`)
  }

  yield* historyForHelper(rest, directoryEntryPrevious, next, ctx)
}

async function* previousOfDirectoryEntry(
  directory: PrivateDirectory,
  entryName: string,
  previousViaParent: AsyncGenerator<PrivateNode, void>,
  ctx: PrivateOperationContext
) {
  for await (const node of previousFor(directory, previousViaParent, ctx)) {
    if (!isPrivateDirectory(node)) {
      throw new Error(`Encountered a private node while iterating the history that can't be interpreted as a directory anymore, at node ${uint8arrays.toString(directory.bareName, "base64url")}`)
    }
    const subNode = await lookupNode(entryName, node, ctx)
    if (subNode == null) {
      return
    }
    yield subNode
  }
}

async function* previousFor(
  node: PrivateNode,
  previousViaParent: AsyncGenerator<PrivateNode, void>,
  ctx: PrivateOperationContext
): AsyncGenerator<PrivateNode, void> {
  let alreadyYieldedCeiling = node.revision
  for await (const versionBefore of previousViaParent) {
    // It's possible that we get a node from the parent
    // with a different inumber, because the node got deleted
    // and immediately recreated (both under e.g. "Apps").
    if (!uint8arrays.equals(versionBefore.bareName, node.bareName)) {
      return
    }
    yield* yieldBetween(node.bareName, alreadyYieldedCeiling, versionBefore.revision, ctx)
    alreadyYieldedCeiling = versionBefore.revision
  }
}

async function* yieldBetween(
  bareName: bloom.BloomFilter,
  current: ratchet.SpiralRatchet,
  older: ratchet.SpiralRatchet,
  ctx: PrivateOperationContext
): AsyncGenerator<PrivateNode, void> {
  for await (const revisionInBetween of ratchet.previous(current, older, ctx.ratchetDisparityBudget())) {
    const ref = await privateRefFor({
      bareName: bareName,
      revision: revisionInBetween
    })
    const block = await ctx.getBlock(ref, ctx)
    if (block == null) {
      return
    }
    const node = nodeFromCbor(block)
    if (!uint8arrays.equals(bareName, node.bareName)) {
      return
    }
    yield node
  }
}
