import NodeFs from "fs"
import NodePath from "path"

import { MemoryBlockstore } from "blockstore-core/memory"
import { CID } from "multiformats"
import { sha256 } from "multiformats/hashes/sha2"

import * as WebCryptoAgent from "../../src/components/agent/implementation/web-crypto-api.js"
import * as DOH from "../../src/components/dns/implementation/dns-over-https.js"
import * as WebCryptoIdentifier from "../../src/components/identifier/implementation/web-crypto-api.js"
import * as ProperManners from "../../src/components/manners/implementation/base.js"
import * as MemoryStorage from "../../src/components/storage/implementation/memory.js"

import * as Codecs from "../../src/dag/codecs.js"

import { ChannelOptions } from "../../src/channel.js"
import { Account, Agent, Channel, Components, DNS, Depot, Identifier, Manners, Storage } from "../../src/components.js"
import { Configuration } from "../../src/configuration.js"
import { CodecIdentifier } from "../../src/dag/codecs.js"
import { FileSystem } from "../../src/fs/class.js"
import { Dictionary as UcanDictionary, Ucan } from "../../src/ucan/types.js"
import { Storage as InMemoryStorage } from "./localforage/in-memory-storage.js"

// 🚀

export const configuration: Configuration = {
  namespace: { name: "ODD SDK Tests", creator: "Fission" },
  debug: false,
  fileSystem: {
    loadImmediately: false,
  },
}

// DEPOT

export const inMemoryDepot: Record<string, Uint8Array> = {}

const depot: Depot.Implementation = {
  blockstore: new MemoryBlockstore(),

  getBlock: (cid: CID) => {
    const data = inMemoryDepot[cid.toString()]
    if (!data) throw new Error("CID not stored in depot")
    return Promise.resolve(data)
  },

  putBlock: async (data: Uint8Array, codecId: CodecIdentifier) => {
    const codec = Codecs.getByIdentifier(codecId)
    const multihash = await sha256.digest(data)
    const cid = CID.createV1(codec.code, multihash)

    inMemoryDepot[cid.toString()] = data

    return cid
  },

  flush: async (dataRoot: CID, proofs: Ucan[]) => {},
}

// STORAGE

const storage: Storage.Implementation = MemoryStorage.implementation()

// MANNERS

const manners: Manners.Implementation<FileSystem> = {
  ...ProperManners.implementation({ configuration }),

  wnfsWasmLookup: async () => {
    const pathToThisModule = new URL(import.meta.url).pathname
    const dirOfThisModule = NodePath.parse(pathToThisModule).dir
    return NodeFs.readFileSync(NodePath.join(dirOfThisModule, `../../node_modules/wnfs/wnfs_wasm_bg.wasm`))
  },
}

// CHANNEL

const channel: Channel.Implementation = {
  establish: (options: ChannelOptions) => {
    throw new Error("Channels are not implemented for tests")
  },
}

// DNS

const dns: DNS.Implementation = DOH.implementation()

// AGENT

const agent: Agent.Implementation = await WebCryptoAgent.implementation({
  store: new InMemoryStorage(),
})

// ACCOUNT

let inMemoryDataRoot: CID | null = null

const account: Account.Implementation = {
  canRegister: async () => ({ ok: true }),
  register: async (formValues: Record<string, string>, identifierUcan: Ucan) => {
    return { ok: true, ucans: [] }
  },

  canUpdateDataRoot: async () => true,
  lookupDataRoot: async () => inMemoryDataRoot,
  updateDataRoot: async (dataRoot: CID, proofs: Ucan[]) => {
    inMemoryDataRoot = dataRoot
    return { ok: true }
  },

  did: async (identifierUcans: Ucan[], ucanDictionary: UcanDictionary) => {
    return identifier.did()
  },

  provideUCANs: () => {
    // TODO
    return []
  },
}

// IDENTIFIER

const identifier: Identifier.Implementation = await WebCryptoIdentifier.implementation({
  store: new InMemoryStorage(),
})

// 🛳

const components: Components = {
  depot,
  manners,
  storage,
  channel,
  dns,
  agent,
  account,
  identifier,
}

export { account, agent, channel, components, depot, dns, identifier, manners, storage }
