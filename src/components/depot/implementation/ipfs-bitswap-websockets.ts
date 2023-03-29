import { Blockstore } from "interface-blockstore"
import { Bitswap, createBitswap } from "ipfs-bitswap"
import { createLibp2p, Libp2p } from "libp2p"
import { mplex } from "@libp2p/mplex"
import { noise } from "@chainsafe/libp2p-noise"
import { webSockets } from "@libp2p/websockets"

import { BlockstoreDatastoreAdapter } from "blockstore-datastore-adapter"
import { LevelDatastore } from "datastore-level"

import { CID } from "multiformats/cid"
import { sha256 } from "multiformats/hashes/sha2"

import * as Codecs from "../../../dag/codecs.js"
import { CodecIdentifier } from "../../../dag/codecs.js"
import { Implementation } from "../implementation.js"
import { Maybe } from "../../../common/types.js"
import { Storage } from "../../../components.js"

import * as Connections from "./ipfs/connections.js"
import * as Peers from "./ipfs/peers.js"


// TRANSPORT


export type Transport = {
  bitswap: Bitswap
  libp2p: Libp2p
}


export async function createTransport(
  blockstore: Blockstore,
  storage: Storage.Implementation,
  peersUrl: string,
  logging: boolean = false
): Promise<Transport> {
  const libp2p = await createLibp2p({
    connectionEncryption: [ noise() ],
    streamMuxers: [ mplex() ],
    transports: [ webSockets() ],
  })

  // Bitswap
  const bitswap = createBitswap(libp2p, blockstore)
  bitswap.start()

  // Connect to peers
  const peers = await Peers.listPeers(
    storage,
    peersUrl
  )

  peers.forEach(peer => {
    Connections.resetPeerTimeoutsTracking(peer)
    Connections.tryConnecting(libp2p, peer, logging)
  })

  // Try connecting when browser comes online
  globalThis.addEventListener("online", async () => {
    (await Peers.listPeers(storage, peersUrl))
      .filter(peer => {
        const peerStr = peer.toString()
        return !peerStr.includes("/localhost/") &&
          !peerStr.includes("/127.0.0.1/") &&
          !peerStr.includes("/0.0.0.0/")
      })
      .forEach(peer => {
        Connections.tryConnecting(libp2p, peer, logging)
      })
  })

  // Fin
  return { bitswap, libp2p }
}



// 🛳


export type ImplementationOptions = {
  blockstoreName: string
  gatewayUrl: string
  peersUrl: string
  storage: Storage.Implementation
}


export async function implementation({ blockstoreName, gatewayUrl, peersUrl, storage }: ImplementationOptions): Promise<Implementation> {
  const blockstore = new BlockstoreDatastoreAdapter(
    new LevelDatastore(blockstoreName)
  )

  // Transport
  // ---------
  let t: Maybe<Transport> = null

  const initiateTransport = async () => {
    if (t) return t
    t = await createTransport(blockstore, storage, peersUrl)
    return t
  }

  // Implementation
  // --------------
  return {
    blockstore,

    // GET

    getBlock: async (cid: CID): Promise<Uint8Array> => {
      if (await blockstore.has(cid)) return blockstore.get(cid)

      // TODO: Can we use CAR files to get a bunch of blocks at once?
      return fetch(`${gatewayUrl.replace(/\/+$/, "")}/api/v0/block/get?arg=${cid.toString()}`)
        .then(r => {
          if (r.ok) return r.arrayBuffer()
          throw new Error("Failed to fetch block from gateway")
        })
        .then(r => new Uint8Array(r))
        .then(async r => {
          await blockstore.put(cid, r)
          return r
        })
    },

    // PUT

    putBlock: async (data: Uint8Array, codecId: CodecIdentifier): Promise<CID> => {
      await initiateTransport()

      const codec = Codecs.getByIdentifier(codecId)
      const multihash = await sha256.digest(data)
      const cid = CID.createV1(codec.code, multihash)

      await blockstore.put(cid, data)

      return cid
    },
  }
}