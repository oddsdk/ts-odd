import { MemoryBlockstore } from "blockstore-core/memory"
import { CID } from "multiformats"
import { sha256 } from "multiformats/hashes/sha2"

import * as LocalAccount from "../../src/components/account/local.js"
import * as WebCryptoAgent from "../../src/components/agent/web-crypto-api.js"
import * as DOH from "../../src/components/dns/dns-over-https/cloudflare-google.js"
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

const memoryBlockstore = new MemoryBlockstore()

const depot: Depot.Implementation = {
  blockstore: memoryBlockstore,

  getBlock: async (cid: CID) => {
    return memoryBlockstore.get(cid)
  },

  putBlock: async (data: Uint8Array, codecId: CodecIdentifier) => {
    const codec = Codecs.getByIdentifier(codecId)
    const multihash = await sha256.digest(data)
    const cid = CID.createV1(codec.code, multihash)

    await memoryBlockstore.put(cid, data)

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

const properManners = ProperManners.implementation(configuration)

const manners: Manners.Implementation<FileSystem> = {
  ...properManners,

  fileSystem: {
    ...properManners.fileSystem,
  },

  program: {
    ...properManners.program,

    online: () => true,
  },
}

/////////////
// CHANNEL //
/////////////

export type ChannelContext = {}

const channel: Channel.Implementation<ChannelContext> = {
  establish: (options: ChannelOptions<ChannelContext>) => {
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

const account: Account.Implementation<LocalAccount.Annex> = LocalAccount.implementation()

////////////////
// IDENTIFIER //
////////////////

const identifier: Identifier.Implementation = await WebCryptoIdentifier.implementation({
  store: new InMemoryStorage(),
})

////////
// 🛳 //
////////

const components: Components<LocalAccount.Annex, ChannelContext> = {
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
