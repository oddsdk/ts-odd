import { CID } from "multiformats"
import { default as init, PublicDirectory, PublicFile, PublicNode } from "wnfs"

import * as Depot from "../../components/depot/implementation.js"
import * as Manners from "../../components/manners/implementation.js"

import { WASM_WNFS_VERSION } from "../../common/version.js"
import { Segments as Path } from "../../path/index.js"

import { UnixTree, Puttable, File, Links, PuttableUnixTree } from "../types.js"
import { BlockStore, DepotBlockStore } from "./DepotBlockStore.js"
import { BaseFile } from "../base/file.js"
import { Metadata } from "../metadata.js"


// This is some global mutable state to work around global mutable state
// issues with wasm-bindgen. It's important we *never* accidentally initialize the
// "wnfs" Wasm module twice.
let initialized = false

async function loadWasm({ manners }: Dependencies) {
  // MUST be prevented from initializing twice:
  // https://github.com/oddsdk/ts-odd/issues/429
  // https://github.com/rustwasm/wasm-bindgen/issues/3307
  if (initialized) return
  initialized = true

  manners.log(`⏬ Loading WNFS WASM`)
  const before = performance.now()
  // init accepts Promises as arguments
  await init(manners.wnfsWasmLookup(WASM_WNFS_VERSION))
  const time = performance.now() - before
  manners.log(`🧪 Loaded WNFS WASM (${time.toFixed(0)}ms)`)
}

type Dependencies = {
  depot: Depot.Implementation
  manners: Manners.Implementation
}

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



// ROOT


export class PublicRootWasm implements UnixTree, Puttable {

  dependencies: Dependencies
  root: Promise<PublicDirectory>
  lastRoot: PublicDirectory
  store: BlockStore
  readOnly: boolean

  constructor(dependencies: Dependencies, root: PublicDirectory, store: BlockStore, readOnly: boolean) {
    this.dependencies = dependencies
    this.root = Promise.resolve(root)
    this.lastRoot = root
    this.store = store
    this.readOnly = readOnly
  }

  static async empty(dependencies: Dependencies): Promise<PublicRootWasm> {
    await loadWasm(dependencies)
    const store = new DepotBlockStore(dependencies.depot)
    const root = new PublicDirectory(new Date())
    return new PublicRootWasm(dependencies, root, store, false)
  }

  static async fromCID(dependencies: Dependencies, cid: CID): Promise<PublicRootWasm> {
    await loadWasm(dependencies)
    const store = new DepotBlockStore(dependencies.depot)
    const root = await PublicDirectory.load(cid.bytes, store)
    return new PublicRootWasm(dependencies, root, store, false)
  }

  private async atomically(fn: (root: PublicDirectory) => Promise<PublicDirectory>) {
    const root = await this.root
    this.root = fn(root)
    await this.root
  }

  private async withError<T>(operation: Promise<T>, opDescription: string): Promise<T> {
    try {
      return await operation
    } catch (e) {
      console.error(`Error during WASM operation ${opDescription}:`)
      throw e
    }
  }

  async ls(path: Path): Promise<Links> {
    const root = await this.root

    const { result: node } = await this.withError(
      root.getNode(path, this.store),
      `ls(${path.join("/")})`
    ) as OpResult<PublicNode | null>

    if (node == null) {
      throw new Error(`Can't ls ${path.join("/")}: No such directory`)
    }

    if (!node.isDir()) {
      throw new Error(`Can't ls ${path.join("/")}: Not a directory`)
    }

    const directory = node.asDir()

    const { result: entries } = await this.withError(
      root.ls(path, this.store),
      `ls(${path.join("/")})`
    ) as OpResult<DirEntry[]>

    const result: Links = {}
    for (const entry of entries) {
      const node = await directory.lookupNode(entry.name, this.store) as PublicNode

      const cid = node.isFile()
        ? CID.decode(await node.asFile().store(this.store))
        : CID.decode(await node.asDir().store(this.store))

      result[ entry.name ] = {
        name: entry.name,
        isFile: entry.metadata.unixMeta.kind === "file",
        size: 0, // TODO size?
        cid,
      }
    }
    return result
  }

  async mkdir(path: Path): Promise<this> {
    await this.atomically(async root => {

      const { rootDir } = await this.withError(
        root.mkdir(path, new Date(), this.store),
        `mkdir(${path.join("/")})`
      ) as OpResult<null>

      return rootDir
    })

    return this
  }

  async cat(path: Path): Promise<Uint8Array> {
    const root = await this.root

    const { result: cidBytes } = await this.withError(
      root.read(path, this.store),
      `read(${path.join("/")})`
    ) as OpResult<Uint8Array>

    const cid = CID.decode(cidBytes)
    return this.dependencies.depot.getUnixFile(cid)
  }

  async add(path: Path, content: Uint8Array): Promise<this> {
    const { cid } = await this.dependencies.depot.putChunked(content)

    await this.atomically(async root => {
      const { rootDir } = await this.withError(
        root.write(path, cid.bytes, new Date(), this.store),
        `write(${path.join("/")})`
      ) as OpResult<null>

      return rootDir
    })

    return this
  }

  async rm(path: Path): Promise<this> {
    await this.atomically(async root => {
      const { rootDir } = await this.withError(
        root.rm(path, this.store),
        `rm(${path.join("/")})`
      ) as OpResult<null>

      return rootDir
    })

    return this
  }

  async mv(from: Path, to: Path): Promise<this> {
    await this.atomically(async root => {
      const { rootDir } = await this.withError(
        root.basicMv(from, to, new Date(), this.store),
        `basicMv(${from.join("/")}, ${to.join("/")})`
      ) as OpResult<null>

      return rootDir
    })

    return this
  }

  async get(path: Path): Promise<PuttableUnixTree | File | null> {
    const root = await this.root
    const { result: node } = await this.withError(
      root.getNode(path, this.store),
      `getNode(${path.join("/")})`
    ) as OpResult<PublicNode>

    if (node == null) {
      return null
    }

    if (node.isFile()) {
      const cachedFile = node.asFile()
      const content = await this.cat(path)
      const directory = path.slice(0, -1)
      const filename = path[ path.length - 1 ]

      return new PublicFileWasm(content, directory, filename, this, cachedFile)

    } else if (node.isDir()) {
      const cachedDir = node.asDir()

      return new PublicDirectoryWasm(this.readOnly, path, this, cachedDir)
    }

    throw new Error(`Unknown node type. Can only handle files and directories.`)
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

  async historyStep(): Promise<PublicDirectory> {
    await this.atomically(async root => {
      const { rootDir: rebasedRoot } = await root.baseHistoryOn(this.lastRoot, this.store) as OpResult<null>
      this.lastRoot = root
      return rebasedRoot
    })
    return await this.root
  }

  async put(): Promise<CID> {
    const rebasedRoot = await this.historyStep()
    const cidBytes = await rebasedRoot.store(this.store) as Uint8Array
    return CID.decode(cidBytes)
  }

  async putDetailed(): Promise<Depot.PutResult> {
    return {
      cid: await this.put(),
      size: 0, // TODO figure out size
      isFile: false,
    }
  }

}



// DIRECTORY


export class PublicDirectoryWasm implements UnixTree, Puttable {
  readOnly: boolean

  private directory: string[]
  private publicRoot: PublicRootWasm
  private cachedDir: PublicDirectory

  constructor(readOnly: boolean, directory: string[], publicRoot: PublicRootWasm, cachedDir: PublicDirectory) {
    this.readOnly = readOnly
    this.directory = directory
    this.publicRoot = publicRoot
    this.cachedDir = cachedDir
  }

  private checkMutability(operation: string) {
    if (this.readOnly) throw new Error(`Directory is read-only. Cannot ${operation}`)
  }

  private async updateCache() {
    const root = await this.publicRoot.root
    const node = await root.getNode(this.directory, this.publicRoot.store)
    this.cachedDir = node.asDir()
  }

  get header(): { metadata: Metadata; previous?: CID } {
    return nodeHeader(this.cachedDir)
  }

  async ls(path: Path): Promise<Links> {
    return await this.publicRoot.ls([ ...this.directory, ...path ])
  }

  async mkdir(path: Path): Promise<this> {
    this.checkMutability(`mkdir at ${[ ...this.directory, ...path ].join("/")}`)
    await this.publicRoot.mkdir([ ...this.directory, ...path ])
    await this.updateCache()
    return this
  }

  async cat(path: Path): Promise<Uint8Array> {
    return await this.publicRoot.cat([ ...this.directory, ...path ])
  }

  async add(path: Path, content: Uint8Array): Promise<this> {
    this.checkMutability(`write at ${[ ...this.directory, ...path ].join("/")}`)
    await this.publicRoot.add([ ...this.directory, ...path ], content)
    await this.updateCache()
    return this
  }

  async rm(path: Path): Promise<this> {
    this.checkMutability(`remove at ${[ ...this.directory, ...path ].join("/")}`)
    await this.publicRoot.rm([ ...this.directory, ...path ])
    await this.updateCache()
    return this
  }

  async mv(from: Path, to: Path): Promise<this> {
    this.checkMutability(`mv from ${[ ...this.directory, ...from ].join("/")} to ${[ ...this.directory, ...to ].join("/")}`)
    await this.publicRoot.mv([ ...this.directory, ...from ], [ ...this.directory, ...to ])
    await this.updateCache()
    return this
  }

  async get(path: Path): Promise<PuttableUnixTree | File | null> {
    return await this.publicRoot.get([ ...this.directory, ...path ])
  }

  async exists(path: Path): Promise<boolean> {
    return await this.publicRoot.exists([ ...this.directory, ...path ])
  }

  async put(): Promise<CID> {
    await this.publicRoot.put()
    const root = await this.publicRoot.root
    const cidBytes: Uint8Array = await root.store(this.publicRoot.store)
    return CID.decode(cidBytes)
  }

  async putDetailed(): Promise<Depot.PutResult> {
    return {
      isFile: false,
      size: 0,
      cid: await this.put()
    }
  }

}



// FILE
// This is somewhat of a weird hack of providing a result for a `get()` operation.


export class PublicFileWasm extends BaseFile {
  private directory: string[]
  private filename: string
  private publicRoot: PublicRootWasm
  private cachedFile: PublicFile

  constructor(content: Uint8Array, directory: string[], filename: string, publicRoot: PublicRootWasm, cachedFile: PublicFile) {
    super(content)
    this.directory = directory
    this.filename = filename
    this.publicRoot = publicRoot
    this.cachedFile = cachedFile
  }

  private async updateCache() {
    const root = await this.publicRoot.root
    const node = await root.getNode([ ...this.directory, this.filename ], this.publicRoot.store)
    this.cachedFile = node.asFile()
  }

  get header(): { metadata: Metadata; previous?: CID } {
    return nodeHeader(this.cachedFile)
  }

  async updateContent(content: Uint8Array): Promise<this> {
    await super.updateContent(content)
    await this.updateCache()
    return this
  }

  async putDetailed(): Promise<Depot.PutResult> {
    const root = await this.publicRoot.root
    const path = [ ...this.directory, this.filename ]
    const { result: node } = await root.getNode(path, this.publicRoot.store) as OpResult<PublicNode>

    if (node == null) {
      throw new Error(`No file at /${path.join("/")}.`)
    }

    if (!node.isFile()) {
      throw new Error(`Not a file at /${path.join("/")}`)
    }

    const file = node.asFile()

    return {
      isFile: true,
      size: 0,
      cid: CID.decode(await file.store(this.publicRoot.store))
    }
  }

}

function nodeHeader(node: PublicFile | PublicDirectory): { metadata: Metadata; previous?: CID } {
  // There's some differences between the two.
  const meta = node.metadata()
  const metadata: Metadata = {
    isFile: meta.unixMeta.kind === "file",
    version: meta.version,
    unixMeta: {
      _type: meta.unixMeta.kind,
      ctime: Number(meta.unixMeta.created),
      mtime: Number(meta.unixMeta.modified),
      mode: meta.unixMeta.mode,
    }
  }

  const previous = node.previousCid()
  return previous == null ? { metadata } : {
    metadata,
    previous: CID.decode(previous),
  }
}
