import * as uint8arrays from "uint8arrays"
import { CID } from "multiformats"
import { IPFS } from "ipfs-core-types"
import { PublicDirectory } from "wnfs"

import { FileContent } from "../../ipfs"
import { Path } from "../../path"
import { AddResult } from "../../ipfs"
import { UnixTree, Puttable, File, Links, Tree, UpdateCallback } from "../types"
import { BlockStore, IpfsBlockStore } from "./IpfsBlockStore"
import { normalizeFileContent } from "../protocol/public"

interface DirEntry {
  name: string
  metadata: {
    version: "3.0.0"
    unixMeta: {
      created: number
      modified: number
      mode: number
      kind: "raw" | "dir" | "file" | "metadata" | "symlink" | "hamtShard"
    }
  }
}

interface OpResult<A> {
  rootDir: PublicDirectory
  result: A
}

export class PublicTreeWasm implements UnixTree, Puttable {

  root: Promise<PublicDirectory>
  store: BlockStore
  ipfs: IPFS
  readOnly: boolean

  constructor(root: PublicDirectory, store: BlockStore, ipfs: IPFS, readOnly: boolean) {
    this.root = Promise.resolve(root)
    this.store = store
    this.ipfs = ipfs
    this.readOnly = readOnly
  }

  static empty(ipfs: IPFS): PublicTreeWasm {
    const root = new PublicDirectory(new Date())
    const store = new IpfsBlockStore(ipfs)
    return new PublicTreeWasm(root, store, ipfs, false)
  }

  async ls(path: Path): Promise<Links> {
    const root = await this.root
    const entries: DirEntry[] = await root.ls(path, this.store)
    const result: Links = {}
    for (const entry of entries) {
      result[entry.name] = {
        name: entry.name,
        isFile: entry.metadata.unixMeta.kind === "file",
        size: 0, // TODO size?
        cid: "", // TODO do we really need a CID here?
      }
    }
    return result
  }

  async mkdir(path: Path, onUpdate?: UpdateCallback): Promise<this> {
    const root = this.root

    this.root = (async () => {
      const { rootDir } = await (await root).mkdir(path, new Date(), this.store) as OpResult<unknown>
      return rootDir
    })()

    return this
  }

  async cat(path: Path): Promise<FileContent> {
    const { result: cidBytes } = await (await this.root).read(path, this.store) as OpResult<Uint8Array>
    const cid = CID.decode(cidBytes)

    const chunks = []
    for await (const chunk of this.ipfs.cat(cid, { preload: false })) {
      chunks.push(chunk)
    }
    return uint8arrays.concat(chunks)
  }

  async add(path: Path, content: FileContent): Promise<this> {
    const normalized = await normalizeFileContent(content)
    const { cid } = await this.ipfs.add(normalized, {
      cidVersion: 1,
      hashAlg: "sha2-256",
      rawLeaves: true,
      wrapWithDirectory: false,
      preload: false,
      pin: false,
    })

    const root = this.root

    this.root = (async () => {
      const { rootDir } = await (await root).write(path, cid.bytes, new Date(), this.store)
      return rootDir
    })()

    return this
  }

  async rm(path: Path): Promise<this> {
    const root = this.root

    this.root = (async () => {
      const { rootDir } = await (await root).rm(path, this.store) as OpResult<unknown>
      return rootDir
    })()

    return this
  }

  async mv(from: Path, to: Path): Promise<this> {
    const root = this.root

    this.root = (async () => {
      const { rootDir } = await (await root).basic_mv(from, to, new Date(), this.store) as OpResult<unknown>
      return rootDir
    })()

    return this
  }

  async get(path: Path): Promise<Tree | File | null> {
    throw new Error("TODO: Build Tree & File shim classes")
  }

  async exists(path: Path): Promise<boolean> {
    const root = await this.root
    try {
      await root.getNode(path, this.store)
      return true
    } catch {
      return false
    }
  }

  async put(): Promise<CID> {
    return (await this.root).store(this.store)
  }

  async putDetailed(): Promise<AddResult> {
    return {
      cid: await this.put(),
      size: 0, // TODO figure out size
      isFile: false,
    }
  }

}