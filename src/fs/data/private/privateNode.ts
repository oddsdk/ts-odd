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

export interface PrivateStore {
  getBlock(ref: PrivateRef, ctx: AbortContext): Promise<Uint8Array | null>
  putBlock(ref: PrivateRef, block: Uint8Array, ctx: AbortContext): Promise<void>
}

export type PrivateOperationContext = PrivateStore & AbortContext


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


async function nodeToCbor(node: PrivateDirectoryPersisted): Promise<Uint8Array> {
  return isPrivateFile(node) ? fileToCbor(node) : await directoryToCbor(node)
}

function fileToCbor(file: PrivateFile): Uint8Array {
  return cbor.encode({
    metadata: file.metadata,
    bareName: file.bareName,
    revision: ratchet.toCborForm(file.revision),
    content: file.content
  })
}

async function directoryToCbor(directory: PrivateDirectoryPersisted): Promise<Uint8Array> {
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

async function privateRefFor(node: PrivateNode): Promise<PrivateRef> {
  const key = await ratchet.toKey(node.revision)
  return {
    key: new Uint8Array(key),
    algorithm: "AES-GCM",
    namefilter: await namefilter.saturate(await namefilter.addToBare(node.bareName, key))
  }
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

  if (nextNode == null || isPrivateFile(nextNode)) {
    return null
  }

  return getNode(rest, nextNode, ctx)
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

export async function lookupDirectory(name: string, directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<PrivateDirectory | null> {
  const node = await lookupNode(name, directory, ctx)
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

  const nextDirectory = await lookupDirectory(name, directory, ctx)
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
