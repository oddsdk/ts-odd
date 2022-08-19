/*

(づ￣ ³￣)づ

IPFS node things.

*/

// Considered dev dependency as these imports will not be present in the resulting lib code
import type { IPFS as IPFSCore } from "ipfs-core-types"
import type { libp2p } from "ipfs-core/components/network"
import type { Options as IPFSOptions } from "ipfs-core/types"

import localforage from "localforage"
import * as keys from "@libp2p/interface-keys"
import { multiaddr, Multiaddr } from "@multiformats/multiaddr"
import { peerIdFromString } from "@libp2p/peer-id"

import * as t from "../common/type-checks.js"
import { IPFSPackage } from "./types.js"
import { setup } from "../setup/internal.js"

import * as repo from "./node/repo.js"


// GLOBAL STATE


const latestPeerTimeoutIds: { [peer: string]: null | ReturnType<typeof setTimeout> } = {}
const isSafari = /^((?!chrome|android).)*safari/i.test(globalThis.navigator?.userAgent || "")



// TYPES


type BackOff = {
  retryNumber: number
  lastBackoff: number
  currentBackoff: number
}

type Status = {
  connected: boolean
  lastConnectedAt: number | null
  latency: number | null
}


type IPFS = IPFSCore & { libp2p: libp2p }



// OPTIONS


/** 🎛️ Connection interval knobs
 *
 * KEEP_ALIVE_INTERVAL: Interval to keep the connection alive when online
 * KEEP_TRYING_INTERVAL: Interval to keep trying the connection when offline
 * BACKOFF_INIT: Starting intervals for fibonacci backoff used when establishing a connection
 */
const KEEP_ALIVE_INTERVAL =
  1 * 60 * 1000 // 1 minute

const KEEP_TRYING_INTERVAL =
  5 * 60 * 1000 // 5 minutes

const BACKOFF_INIT = {
  retryNumber: 0,
  lastBackoff: 0,
  currentBackoff: 1000
}



/** 🎛️ IPFS Options
 */
export const OPTIONS: IPFSOptions = {
  config: {
    Addresses: {
      Delegates: []
    },
    Bootstrap: [],
    Discovery: {
      webRTCStar: { Enabled: false }
    },
    Pubsub: {
      Enabled: false
    }
  },
  preload: {
    enabled: false,
    addresses: []
  },
  libp2p: {
    peerDiscovery: [],
    connectionManager: {
      autoDial: false
    }
  },
  init: {
    algorithm: isSafari ? keys.RSA : undefined
  },
  repo: repo.create()
}



// 🚀


export async function createAndConnect(pkg: IPFSPackage): Promise<IPFSCore> {
  const peers = await listPeers()

  if (peers.length === 0) {
    throw new Error("💥 Couldn't start IPFS node, peer list is empty")
  }

  // Start an IPFS node & connect to all the Fission peers
  const ipfs: IPFSCore = await pkg.create(OPTIONS)

  peers.forEach(peer => {
    latestPeerTimeoutIds[peer.toString()] = null
    tryConnecting(ipfs as unknown as IPFS, peer)
  })

  // Try connecting when browser comes online
  globalThis.addEventListener("online", async () => {
    (await listPeers())
      .filter(peer => {
        const peerStr = peer.toString()
        return !peerStr.includes("/localhost/") &&
               !peerStr.includes("/127.0.0.1/") &&
               !peerStr.includes("/0.0.0.0/")
      })
      .forEach(peer => {
        tryConnecting(ipfs as unknown as IPFS, peer)
      })
  })

  // Fin
  console.log("🚀 Started IPFS node")
  return ipfs
}



// PEERS
// -----

export function fetchFissionPeers(): Promise<string[]> {
  const peersUrl = `${setup.getApiEndpoint()}/ipfs/peers`

  return fetch(peersUrl)
    .then(r => r.json())
    .then(r => Array.isArray(r) ? r : [])
    .then(r => r.filter(p => t.isString(p) && p.includes("/wss/")))
    .catch(e => { throw new Error("💥 Couldn't start IPFS node, failed to fetch peer list") })
}


export async function listPeers(): Promise<Multiaddr[]> {
  let peers
  const maybePeers = await localforage.getItem("ipfsPeers")

  if (t.isString(maybePeers)) {
    peers = maybePeers.split(",")

    fetchFissionPeers().then(list =>
      localforage.setItem("ipfsPeers", list.join(","))
    ).catch(err => {
      // don't throw
      console.error(err)
    })

  } else {
    peers = await fetchFissionPeers()
    await localforage.setItem("ipfsPeers", peers.join(","))

  }

  return peers.map(multiaddr)
}



// CONNECTIONS
// -----------

function keepAlive(ipfs: IPFS, peer: Multiaddr, backoff: BackOff, status: Status): void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  if (backoff.currentBackoff < KEEP_TRYING_INTERVAL) {
    // Start race between reconnect and ping
    timeoutId = setTimeout(() => reconnect(ipfs, peer, backoff, status), backoff.currentBackoff)

  } else {
    // Disregard backoff, but keep trying
    timeoutId = setTimeout(() => reconnect(ipfs, peer, backoff, status), KEEP_TRYING_INTERVAL)

  }

  // Track the latest reconnect attempt
  latestPeerTimeoutIds[peer.toString()] = timeoutId

  ping(ipfs, peer).then(({ latency }) => {
    const updatedStatus = { connected: true, lastConnectedAt: Date.now(), latency }
    report(peer, updatedStatus)

    // Cancel reconnect because ping won
    if (timeoutId) clearTimeout(timeoutId)

    // Keep alive after the latest ping-reconnect race, ignore the rest
    if (timeoutId === latestPeerTimeoutIds[peer.toString()]) {
      setTimeout(() => keepAlive(ipfs, peer, BACKOFF_INIT, updatedStatus), KEEP_ALIVE_INTERVAL)
    }
  }).catch(() => {
    // ignore errors
  })
}


async function reconnect(ipfs: IPFS, peer: Multiaddr, backoff: BackOff, status: Status): Promise<void> {
  const updatedStatus = { ...status, connected: false, latency: null }

  report(peer, updatedStatus)

  try {
    await ipfs.swarm.disconnect(peer)
    await ipfs.swarm.connect(peer)
  } catch {
    // No action needed, we will retry
  }

  if (backoff.currentBackoff < KEEP_TRYING_INTERVAL) {
    const nextBackoff = {
      retryNumber: backoff.retryNumber + 1,
      lastBackoff: backoff.currentBackoff,
      currentBackoff: backoff.lastBackoff + backoff.currentBackoff
    }

    keepAlive(ipfs, peer, nextBackoff, updatedStatus)
  } else {
    keepAlive(ipfs, peer, backoff, updatedStatus)
  }
}


export function tryConnecting(ipfs: IPFS, peer: Multiaddr): void {
  ping(ipfs, peer).then(({ latency }) => {
    return ipfs.swarm
      .connect(peer, { timeout: 60 * 1000 })
      .then(() => {
        console.log(`🪐 Connected to ${peer}`)

        const status = { connected: true, lastConnectedAt: Date.now(), latency }
        report(peer, status)

        // Ensure permanent connection to Fission gateway
        // TODO: This is a temporary solution while we wait for
        //       https://github.com/libp2p/js-libp2p/issues/744
        //       (see "Keep alive" bit)
        setTimeout(() => keepAlive(ipfs, peer, BACKOFF_INIT, status), KEEP_ALIVE_INTERVAL)
      })

  }).catch(() => {
    console.log(`🪓 Could not connect to ${peer}`)

    const status = { connected: false, lastConnectedAt: null, latency: null }

    report(peer, status)
    keepAlive(ipfs, peer, BACKOFF_INIT, status)

  })
}


export async function ping(ipfs: IPFS, peer: Multiaddr): Promise<{ latency: number }> {
  return ipfs.libp2p.ping(peer).then(latency => ({ latency }))
}



// REPORTING
// ---------

let peerConnections: { peer: Multiaddr; status: Status }[] = []
let monitoringPeers = false


function report(peer: Multiaddr, status: Status): void {
  peerConnections = peerConnections
    .filter(connection => connection.peer !== peer)
    .concat({ peer, status })

  const offline = peerConnections.every(connection => !connection.status.connected)
  const lastConnectedAt: number = peerConnections.reduce((newest, { status }) =>
    newest >= (status.lastConnectedAt || 0) ? newest : (status.lastConnectedAt || 0),
    0
  )

  const activeConnections = peerConnections.filter(connection => connection.status.latency !== null)
  const averageLatency = activeConnections.length > 0
    ? peerConnections.reduce((sum, connection) => sum + (connection.status.latency || 0), 0) / activeConnections.length
    : null

  if (monitoringPeers) {
    console.table(peerConnections)
    console.log("offline", offline)
    console.log("last connected at", lastConnectedAt === 0 ? null : lastConnectedAt)
    console.log("average latency", averageLatency)
  }
}


export async function monitorPeers() {
  monitoringPeers = true
  console.log("📡 Monitoring IPFS peers")
}


export function stopMonitoringPeers() {
  monitoringPeers = false
}



// 🔮


let monitor: ReturnType<typeof setTimeout> | null = null


export async function monitorBitswap(ipfs: IPFS, verbose: boolean): Promise<void> {
  const cidCount: { [k: string]: number } = {}
  const seen: string[] = []
  const peers = await listPeers()

  verbose = verbose === undefined ? false : true

  console.log("🕵️‍♀️ Monitoring IPFS bitswap requests")
  await stopMonitoringBitswap()

  monitor = setInterval(async () => {
    const peerList = peers

    peerList.map(async peer => {
      const peerIdString = peer.getPeerId()
      if (!peerIdString) return
      const peerId = peerIdFromString(peerIdString)
      const wantList = await ipfs.bitswap.wantlistForPeer(peerId, { timeout: 120 * 1000 })

      wantList.forEach(async cid => {
        const c = cid.toString()
        const s = peer + "-" + c

        if (!seen.includes(s)) {
          const seenCid = !!cidCount[c]
          const emoji = seenCid ? "📡" : "🔮"
          const msg = `${emoji} Peer ${peer} requested CID ${c}`

          cidCount[c] = (cidCount[c] || 0) + 1

          if (seenCid) {
            if (verbose) console.log(msg + ` (#${cidCount[c]})`)
            return
          } else {
            console.log(msg)
          }

          const start = performance.now()
          seen.push(s)

          const dag = await ipfs.dag.get(cid)
          const end = performance.now()
          const diff = end - start
          const loaded = `loaded locally in ${diff.toFixed(2)} ms`

          if (dag.value.Links) {
            console.log(`🧱 ${c} is a 👉 DAG structure (${loaded})`)
            ;(console.table || console.log)(
                dag.value.Links
                  .map((l: unknown) => {
                    if (t.isObject(l) && t.hasProp(l, "Name") && t.hasProp(l, "Hash")) {
                      return { name: l.Name, cid: (l.Hash as unknown as string).toString() }
                    } else {
                      return null
                    }
                  })
                  .filter((a: { name: string; cid: string } | null) => a)
              )

          } else {
            console.log(`📦 ${c} is 👉 Data (${loaded})`)
            console.log(dag.value)

          }
        }
      })
    })
  }, 20)
}


export async function stopMonitoringBitswap() {
  if (monitor) clearInterval(monitor)
}