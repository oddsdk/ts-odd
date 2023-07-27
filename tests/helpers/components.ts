import NodeFs from "fs"
import NodePath from "path"

import { MemoryBlockstore } from "blockstore-core/memory"
import { CID } from "multiformats"
import { sha256 } from "multiformats/hashes/sha2"

import * as LocalAccount from "../../src/components/account/local.js"
import * as WebCryptoAgent from "../../src/components/agent/web-crypto-api.js"
import * as DOH from "../../src/components/dns/dns-over-https.js"
import * as WebCryptoIdentifier from "../../src/components/identifier/web-crypto-api.js"
import * as ProperManners from "../../src/components/manners/default.js"
import * as MemoryStorage from "../../src/components/storage/memory.js"

import * as Codecs from "../../src/dag/codecs.js"

import { ChannelOptions } from "../../src/channel.js"
import { Account, Agent, Channel, Components, DNS, Depot, Identifier, Manners, Storage } from "../../src/components.js"
import { Configuration } from "../../src/configuration.js"
import { CodecIdentifier } from "../../src/dag/codecs.js"
import { FileSystem } from "../../src/fs/class.js"
import { Ucan } from "../../src/ucan/types.js"
import { Storage as InMemoryStorage } from "./localforage/in-memory-storage.js"

////////
// 🚀 //
////////

export const configuration: Configuration = {
  namespace: { name: "ODD SDK Tests", creator: "Fission" },
  debug: false,
}

///////////
// DEPOT //
///////////

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

/////////////
// STORAGE //
/////////////

const storage: Storage.Implementation = MemoryStorage.implementation()

/////////////
// MANNERS //
/////////////

const manners: Manners.Implementation<FileSystem> = {
  ...ProperManners.implementation(configuration),

  wnfsWasmLookup: async () => {
    if (typeof self === "undefined") {
      return undefined
    } else {
      // const pathToThisModule = new URL(import.meta.url).pathname
      // const dirOfThisModule = NodePath.parse(pathToThisModule).dir
      // return NodeFs.readFileSync(NodePath.join(dirOfThisModule, `../../node_modules/wnfs/wnfs_wasm_bg.wasm`))
    }

    //  const response = await fetch("https://unpkg.com/wnfs@0.1.23/wnfs_wasm_bg.wasm")
    // const buffer = await response.arrayBuffer()

    // return buffer
    // return fetch(`https://unpkg.com/wnfs@0.1.23/wnfs_wasm_bg.wasm`)

    // const pathToThisModule = new URL(import.meta.url).pathname
    // console.log('PATH',pathToThisModule)
    // const dirOfThisModule = NodePath.parse(pathToThisModule).dir

    // const wnfs = await import (`${dirOfThisModule}/../../node_modules/wnfs/wnfs_wasm_bg.wasm`)
    // console.log('wnfs', wnfs)

    // return wnfs
    // return await fetch(`${dirOfThisModule}/../../node_modules/wnfs/wnfs_wasm_bg.wasm`)

    // return NodeFs.readFileSync(NodePath.join(dirOfThisModule, `../../node_modules/wnfs/wnfs_wasm_bg.wasm`))
  },
}

/////////////
// CHANNEL //
/////////////

const channel: Channel.Implementation = {
  establish: (options: ChannelOptions) => {
    throw new Error("Channels are not implemented for tests")
  },
}

/////////
// DNS //
/////////

const dns: DNS.Implementation = DOH.implementation()

///////////
// AGENT //
///////////

const agent: Agent.Implementation = await WebCryptoAgent.implementation({
  store: new InMemoryStorage(),
})

/////////////
// ACCOUNT //
/////////////

const account: Account.Implementation<LocalAccount.Annex> = LocalAccount.implementation({ storage })

////////////////
// IDENTIFIER //
////////////////

const identifier: Identifier.Implementation = await WebCryptoIdentifier.implementation({
  store: new InMemoryStorage(),
})

////////
// 🛳 //
////////

const components: Components<LocalAccount.Annex> = {
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
