import { CID } from "multiformats"
import * as Raw from "multiformats/codecs/raw"
import { sha256 } from "multiformats/hashes/sha2"
import { default as init, PublicDirectory, setPanicHook } from "wnfs"
import fs from "fs"

async function loadWasm() {
  await init(fs.readFileSync(`./node_modules/wnfs/wnfs_wasm_bg.wasm`))
  setPanicHook();
}

class MemoryBlockStore {
  store

  /** Creates a new in-memory block store. */
  constructor() {
    this.store = new Map();
  }

  /** Stores an array of bytes in the block store. */
  async getBlock(cid) {
    const decoded_cid = CID.decode(cid);
    return this.store.get(decoded_cid.toString());
  }

  /** Retrieves an array of bytes from the block store with given CID. */
  async putBlock(bytes, code) {
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, code, hash);
    this.store.set(cid.toString(), bytes);
    return cid.bytes;
  }
}

const store = new MemoryBlockStore()

class PublicRootWasm {

  root // PublicDirectory

  constructor(root) {
    this.root = root
  }

  static async empty() {
    await loadWasm()
    const root = new PublicDirectory(new Date())
    return new PublicRootWasm(root)
  }

  async mkdir(path) {
    const { rootDir } = await this.root.mkdir(path, new Date(), store);
    this.root = rootDir
  }

  async rm(path) {
    const { rootDir } = await this.root.rm(path, store)
    this.root = rootDir;
  }

  async mv(from, to) {
    const { rootDir } = await this.root.basicMv(from, to, new Date(), store)
    this.root = rootDir
  }

  async exists(path) {
    try {
      const { result: node } = await this.root.getNode(path, store);
      return node != null
    } catch {
      return false
    }
  }

}

let root = await PublicRootWasm.empty()

const pathSegment = "somepath"

await root.mkdir([pathSegment])
await root.exists([pathSegment])

global.gc()

root = await PublicRootWasm.empty()

await root.mkdir([pathSegment])
await root.rm([pathSegment])
