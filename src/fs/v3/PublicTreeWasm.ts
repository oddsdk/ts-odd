import * as uint8arrays from "uint8arrays"
import { CID } from "multiformats"
import { IPFS } from "ipfs-core-types"
import { PublicDirectory } from "wnfs"

import { FileContent } from "../../ipfs/index.js"
import { Path } from "../../path.js"
import { AddResult } from "../../ipfs/index.js"
import { UnixTree, Puttable, File, Links, Tree } from "../types.js"
import { BlockStore, IpfsBlockStore } from "./IpfsBlockStore.js"
import { normalizeFileContent } from "../protocol/public/index.js"

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
  lastRoot: PublicDirectory
  store: BlockStore
  ipfs: IPFS
  readOnly: boolean

  constructor(root: PublicDirectory, store: BlockStore, ipfs: IPFS, readOnly: boolean) {
    this.root = Promise.resolve(root)
    this.lastRoot = root
    this.store = store
    this.ipfs = ipfs
    this.readOnly = readOnly
  }

  static empty(ipfs: IPFS): PublicTreeWasm {
    const store = new IpfsBlockStore(ipfs)
    const root = new PublicDirectory(new Date())
    return new PublicTreeWasm(root, store, ipfs, false)
  }

  static async fromCID(ipfs: IPFS, cid: CID): Promise<PublicTreeWasm> {
    const store = new IpfsBlockStore(ipfs)
    const root = await PublicDirectory.load(cid.bytes, store)
    return new PublicTreeWasm(root, store, ipfs, false)
  }

  async ls(path: Path): Promise<Links> {
    const root = await this.root
    const { result: entries } = await root.ls(path, this.store) as OpResult<DirEntry[]>
    const result: Links = {}
    for (const entry of entries) {
      result[entry.name] = {
        name: entry.name,
        isFile: entry.metadata.unixMeta.kind === "file",
        size: 0, // TODO size?
        cid: "not provided for performance ", // TODO do we really need a CID here?
      }
    }
    return result
  }

  async mkdir(path: Path): Promise<this> {
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
      const rootFetched = await root
      const { rootDir } = await rootFetched.write(path, cid.bytes, new Date(), this.store) as OpResult<unknown>
      rootFetched.free()
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
      const { rootDir } = await (await root).basicMv(from, to, new Date(), this.store) as OpResult<unknown>
      return rootDir
    })()

    return this
  }

  async get(path: Path): Promise<Tree | File | null> {
    throw new Error("TODO: Build Tree & File shim classes")
  }

  async exists(path: Path): Promise<boolean> {
    const root = await this.root
    const { result } = await root.getNode(path, this.store)
    return result != null
  }

  async historyStep(): Promise<PublicDirectory> {
    const root = this.root
    this.root = (async () => {
      const { rootDir: rebasedRoot } = await (await root).baseHistoryOn(this.lastRoot, this.store)
      this.lastRoot = rebasedRoot
      return rebasedRoot
    })()
    return await this.root
  }

  async put(): Promise<CID> {
    const rebasedRoot = await this.historyStep()
    const cidBytes = await rebasedRoot.store(this.store) as Uint8Array
    return CID.decode(cidBytes)
  }

  async putDetailed(): Promise<AddResult> {
    return {
      cid: await this.put(),
      size: 0, // TODO figure out size
      isFile: false,
    }
  }

}