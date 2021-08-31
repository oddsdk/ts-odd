import * as cbor from "cborg"
import * as uint8arrays from "uint8arrays"

import { Metadata } from "../metadata.js"
import { mapRecord } from "../links.js"
import { isNonEmpty } from "../common.js"
import { Ref } from "../ref.js"
import * as bloom from "./bloomfilter.js"
import * as namefilter from "./namefilter.js"
import * as ratchet from "./spiralratchet.js"


type PrivateNode = PrivateDirectory | PrivateFile

interface PrivateDirectory {
  metadata: Metadata
  bareName: bloom.BloomFilter
  revision: ratchet.SpiralRatchet
  links: { [path: string]: LazyPrivateRef<PrivateNode> }
}

interface PrivateFile {
  metadata: Metadata
  bareName: bloom.BloomFilter
  revision: ratchet.SpiralRatchet // so anyone reading this can fetch newer versions
  content: PrivateRef
}

interface PrivateRef {
  key: Uint8Array // 32bit AES key
  algorithm: "AES-256-GCM" // only supported algorithm right now
  hash: Uint8Array // sha-256 hash of saturated namefilter
}

interface ParentBareName {
  parentBareName: bloom.BloomFilter
}

interface PrivateStoreContext {
  getBlock(ref: PrivateRef, ctx: AbortContext): Promise<Uint8Array | null>
  putBlock(ref: PrivateRef, block: Uint8Array, ctx: AbortContext): Promise<void>
}

interface AbortContext {
  signal?: AbortSignal
}

type PrivateOperationContext = PrivateStoreContext & AbortContext


type LazyPrivateRef<T> = Ref<T, PrivateRef, PrivateOperationContext>


const privateRef = <T>(ref: PrivateRef, deserialize: (bytes: Uint8Array) => T): LazyPrivateRef<T> => {
  let obj: Promise<T> | null = null
  let loadedObj: T | null = null

  return Object.freeze({

    async get({ getBlock, signal }: PrivateOperationContext) {
      if (obj == null) {
        obj = getBlock(ref, { signal }).then(block => {
          if (block == null) throw new Error(`Couldn't find block with name hash ${uint8arrays.toString(ref.hash, "base64url")}`)
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
        hash: uint8arrays.toString(ref.hash, "base64url"),
      }
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


export async function nodeToCbor(node: PrivateNode, ctx: PrivateOperationContext): Promise<Uint8Array> {
  return isPrivateFile(node) ? fileToCbor(node) : await directoryToCbor(node, ctx)
}

export function fileToCbor(file: PrivateFile): Uint8Array {
  return cbor.encode({
    metadata: file.metadata,
    bareName: file.bareName,
    revision: ratchet.toCborForm(file.revision),
    content: file.content
  })
}

export async function directoryToCbor(directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<Uint8Array> {
  return cbor.encode({
    metadata: directory.metadata,
    bareName: directory.bareName,
    revision: ratchet.toCborForm(directory.revision),
    links: await mapRecord(directory.links, async (_, link) => await link.ref(ctx))
  })
}

// export async function loadPrivateNode(ref: PrivateRef, ctx: PrivateOperationContext)



//--------------------------------------
// Operations
//--------------------------------------


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

export async function lookupNode(path: string, directory: PrivateDirectory, ctx: PrivateOperationContext): Promise<PrivateNode | null> {
  return directory.links[path]?.get(ctx)
}
