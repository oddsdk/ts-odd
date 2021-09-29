import * as cbor from "cborg"

import { BlockStore } from "./blockStore.js"
import { PublicDirectory } from "./public/publicNode.js"
import * as publicNode from "./public/publicNode.js"
import { AbortContext, isNonEmpty } from "./common.js"
import { Encoding, EncodingOptions, EncodingTypeFor, WritableDirectory } from "./types.js"
import { CID } from "multiformats/cid"
import { Metadata } from "./metadata.js"



interface Codec<E extends Encoding> {
  encode(data: EncodingTypeFor<E>, store: BlockStore, signal?: AbortSignal): Promise<CID>
  decode(cid: CID, store: BlockStore, signal?: AbortSignal): Promise<EncodingTypeFor<E>>
}

const codecs: { [K in Encoding]: Codec<K> } = {
  ["cid"]: {
    async encode(cid) {
      return cid
    },
    async decode(cid: CID) {
      return cid
    },
  },

  ["raw"]: {
    async encode(data, store, signal) {
      return await store.putBlock(data, { code: 0xff, name: "raw" }, { signal })
    },
    async decode(cid, store, signal) {
      return await store.getBlock(cid, { signal })
    },
  },

  ["utf8"]: {
    async encode(data, store, signal) {
      return await store.putBlock(new TextEncoder().encode(data), { code: 0xff, name: "raw" }, { signal })
    },
    async decode(cid, store, signal) {
      return new TextDecoder().decode(await store.getBlock(cid, { signal }))
    },
  },

  ["json"]: {
    async encode(data, store, signal) {
      return await store.putBlock(new TextEncoder().encode(JSON.stringify(data, null, 2)), { code: 0xff, name: "raw" }, { signal })
    },
    async decode(cid, store, signal) {
      return JSON.parse(new TextDecoder().decode(await store.getBlock(cid, { signal })))
    },
  },

  ["cbor"]: {
    async encode(data, store, signal) {
      return await store.putBlock(cbor.encode(data), { code: 0xff, name: "raw" }, { signal })
    },
    async decode(cid, store, signal) {
      return cbor.decode(await store.getBlock(cid, { signal }))
    },
  },

}


export class PublicFileSystem implements WritableDirectory {

  private store: BlockStore
  private root: PublicDirectory

  private operationLock: Promise<unknown> | null

  constructor(store: BlockStore, root: PublicDirectory) {
    this.store = store
    this.root = root
    this.operationLock = null
  }

  async write(
    path: string[],
    content: EncodingTypeFor<typeof encoding>,
    { encoding, signal }: EncodingOptions & AbortContext
  ): Promise<void> {
    if (!isNonEmpty(path)) {
      throw new Error(`PublicFileSystem#write: Can't write to empty path.`)
    }
    if (encoding == null) {
      throw new Error(`PublicFileSystem#write: Encoding needs to be specified.`)
    }
    if (codecs[encoding] == null) {
      throw new Error(`PublicFileSystem#write: Unknown encoding ${encoding}. Must be one of: ${Object.keys(codecs).join(", ")}`)
    }
    await this.withLock(async () => {
      const cid = await codecs[encoding].encode(content as any, this.store, signal)
      const now = Date.now()
      const ctx = { ...this.store, now, signal }
      const intermediate = await publicNode.write(path, cid, this.root, ctx)
      this.root = await publicNode.baseHistoryOn(intermediate, this.root, ctx)
    })
  }

  async mkdir(path: string[], options?: AbortContext): Promise<void> {
    const signal = options?.signal

    if (!isNonEmpty(path)) {
      throw new Error(`PublicFileSystem#mkdir: Can't mkdir an empty path.`)
    }
    await this.withLock(async () => {
      const now = Date.now()
      const ctx = { ...this.store, now, signal }
      const intermediate = await publicNode.mkdir(path, this.root, ctx)
      this.root = await publicNode.baseHistoryOn(intermediate, this.root, ctx)
    })
  }

  async read(path: string[], { encoding, signal }: EncodingOptions & AbortContext): Promise<EncodingTypeFor<typeof encoding>> {
    if (!isNonEmpty(path)) {
      throw new Error(`PublicFileSystem#read: Can't read empty path.`)
    }
    if (encoding == null) {
      throw new Error(`PublicFileSystem#read: Encoding needs to be specified.`)
    }
    if (codecs[encoding] == null) {
      throw new Error(`PublicFileSystem#read: Unknown encoding ${encoding}. Must be one of: ${Object.keys(codecs).join(", ")}`)
    }
    return await this.withLock(async () => {
      const ctx = { ...this.store, signal }
      const cid = await publicNode.read(path, this.root, ctx)
      return await codecs[encoding].decode(cid, this.store, signal)
    })
  }

  async exists(path: string[], options?: AbortContext): Promise<boolean> {
    const signal = options?.signal

    if (path?.length === 0) {
      return true
    }
    
    if (!isNonEmpty(path)) {
      throw new Error(`PublicFileSystem#exists: Invalid path argument ${path}.`)
    }

    return await this.withLock(async () => {
      const ctx = { ...this.store, signal }
      return await publicNode.exists(path, this.root, ctx)
    })
  }

  async ls(path: string[], options?: AbortContext): Promise<string[]> {
    const signal = options?.signal

    return await this.withLock(async () => {
      const ctx = { ...this.store, signal }
      return Object.keys(await publicNode.ls(path, this.root, ctx))
    })
  }

  async metadataFor(path: string[], options?: AbortContext): Promise<Metadata> {
    const signal = options?.signal

    if (path?.length === 0) {
      return Object.freeze(this.root.metadata)
    }
    
    if (!isNonEmpty(path)) {
      throw new Error(`PublicFileSystem#metadataFor: Invalid path argument ${path}.`)
    }

    return await this.withLock(async () => {
      const ctx = { ...this.store, signal }
      const node = await publicNode.getNode(path, this.root, ctx)
      if (node == null) {
        throw new Error(`PublicFileSystem#metadataFor: No file or directory ${path}.`)
      }
      return Object.freeze(node.metadata)
    })
  }



  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    if (this.operationLock != null) {
      await this.operationLock
    }
    const doIt = async () => {
      try {
        return await operation()
      } finally {
        this.operationLock = null
      }
    }
    const promise = doIt()
    this.operationLock = promise
    return await promise
  }

}