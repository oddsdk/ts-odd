import * as cbor from "cborg"
import * as uint8arrays from "uint8arrays"

import * as metadata from "../metadata.js"
import { mapRecord, mapRecordSync } from "../links.js"
import { AbortContext, CborForm, hasProp, isNonEmpty, Timestamp } from "../common.js"
import { Ref } from "../ref.js"
import * as bloom from "./bloomfilter.js"
import * as namefilter from "./namefilter.js"
import * as ratchet from "./spiralratchet.js"
import { crypto } from "./webcrypto.js"


export type PrivateNode = PrivateDirectory | PrivateFile

export interface PrivateDirectory {
  metadata: metadata.Metadata
  bareName: bloom.BloomFilter
  revision: ratchet.SpiralRatchet
  links: { [path: string]: LazyPrivateRef<PrivateNode> }
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


export type LazyPrivateRef<T> = Ref<T, PrivateRef, PrivateOperationContext>


export const privateRef = <T>(ref: PrivateRef, deserialize: (bytes: Uint8Array) => T): LazyPrivateRef<T> => {
  let obj: Promise<T> | null = null
  let loadedObj: T | null = null

  return Object.freeze({

    async get({ getBlock, signal }: PrivateOperationContext) {
      if (obj == null) {
        obj = getBlock(ref, { signal }).then(block => {
          if (block == null) throw new Error(`Couldn't find block with namefilter ${uint8arrays.toString(ref.namefilter, "base64url")}`)
          return deserialize(block)
        }).then(loaded => loadedObj = loaded)
      }
      return await obj
    },

    async ref() {
      return ref
    },

    toObject() {
      if (loadedObj != null) loadedObj
      return {
        key: uint8arrays.toString(ref.key, "base64url"),
        algorithm: ref.algorithm,
        hash: uint8arrays.toString(ref.namefilter, "base64url"),
      }
    }

  })
}


export const privateRefFromObj = <T>(obj: T, put: (obj: T, ctx: PrivateOperationContext) => Promise<PrivateRef>): LazyPrivateRef<T> => {

  let ref: Promise<PrivateRef> | null = null

  return Object.freeze({

    async get() {
      return obj
    },

    async ref(ctx: PrivateOperationContext) {
      if (ref == null) {
        ref = put(obj, ctx)
      }
      return await ref
    },

    toObject() {
      return obj
    }

  })
}


export function isPrivateFile(node: PrivateNode): node is PrivateFile {
  return node.metadata.isFile
}

export function isPrivateDirectory(node: PrivateNode): node is PrivateDirectory {
  return !node.metadata.isFile
}


//--------------------------------------
// Persistence
//--------------------------------------


async function nodeToCbor(node: PrivateNode, ctx: PrivateOperationContext): Promise<Uint8Array> {
  return isPrivateFile(node) ? fileToCbor(node) : await directoryToCbor(node, ctx)
}

function fileToCbor(file: PrivateFile): Uint8Array {
  return cbor.encode({
    metadata: file.metadata,
    bareName: file.bareName,
    revision: ratchet.toCborForm(file.revision),
    content: file.content
  })
}

async function directoryToCbor(directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<Uint8Array> {
  return cbor.encode({
    metadata: directory.metadata,
    bareName: directory.bareName,
    revision: ratchet.toCborForm(directory.revision),
    links: await mapRecord(directory.links, async (_, link) => await link.ref(ctx))
  })
}

function nodeFromCbor(bytes: Uint8Array): PrivateNode {
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

    return node as PrivateNode
  } else {
    if (!hasProp(node, "links")) throw error("Missing key 'links' for directory")
    node.links = mapRecordSync(node.links as Record<string, PrivateRef>, (_, link) => privateRef(link, nodeFromCbor))
    return node as PrivateDirectory
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

export async function storeNode(node: PrivateNode, ctx: PrivateOperationContext): Promise<PrivateRef> {
  const ref = await privateRefFor(node)
  await ctx.putBlock(ref, await nodeToCbor(node, ctx), { signal: ctx.signal })
  return ref
}

export async function loadNode(ref: PrivateRef, ctx: PrivateOperationContext): Promise<PrivateNode> {
  const block = await ctx.getBlock(ref, { signal: ctx.signal })
  
  if (block == null) throw new Error(`Couldn't find a node at reference ${uint8arrays.toString(ref.namefilter, "base64url")}`)

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

  if (nextNode == null || isPrivateFile(nextNode)) {
    return null
  }

  return getNode(rest, nextNode, ctx)
}

export async function lookupNode(name: string, directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<PrivateNode | null> {
  return directory.links[name]?.get(ctx)
}

export async function lookupDirectory(name: string, directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<PrivateDirectory | null> {
  const node = await lookupNode(name, directory, ctx)
  if (node == null || !isPrivateDirectory(node)) return null
  return node
}

export async function upsert(
  path: [string, ...string[]],
  update: (parentBareName: bloom.BloomFilter, entry: LazyPrivateRef<PrivateNode> | null) => Promise<LazyPrivateRef<PrivateNode> | null>,
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
      [name]: privateRefFromObj(changedDirectory, storeNode)
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
      if (entry == null) {
        const file = await newFile(parentBareName, ctx)
        return privateRefFromObj({ ...file, content }, storeNode)
      }
      const node = await entry.get(ctx)
      if (isPrivateDirectory(node)) {
        throw new Error(`Can't write file to ${path}: There already exists a directory.`)
      }
      return privateRefFromObj({ ...node, content }, storeNode)
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
        [name]: privateRefFromObj(await newDirectory(directory.bareName, ctx), storeNode)
      }
    }
  }

  const nextDirectory = existing == null ? await newDirectory(directory.bareName, ctx) : existing

  const changedDirectory = await mkdir(restPath, nextDirectory, ctx)

  return {
    ...directory,
    links: {
      ...directory.links,
      [name]: privateRefFromObj(changedDirectory, storeNode)
    }
  }
}
