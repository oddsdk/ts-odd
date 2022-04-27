/*

(づ￣ ³￣)づ

IPFS (Shared) Worker.
Pretty much copied from an example on https://github.com/ipfs/js-ipfs

*/


import type { IPFS, Options } from "ipfs-core"
import type { libp2p } from "ipfs-core/src/components/network"
import type { MultiService } from "ipfs-message-port-protocol/src/rpc"
import type { PBLink } from "@ipld/dag-pb"

import { create as createIpfs } from "ipfs-core"
import * as localforage from "localforage"
import { Server, IPFSService } from "ipfs-message-port-server"


interface IPFSWorkerGlobalScope extends WorkerGlobalScope {
  // Worker
  addEventListener<K extends keyof DedicatedWorkerGlobalScopeEventMap>(type: K, listener: (this: DedicatedWorkerGlobalScope, ev: DedicatedWorkerGlobalScopeEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void
  removeEventListener<K extends keyof DedicatedWorkerGlobalScopeEventMap>(type: K, listener: (this: DedicatedWorkerGlobalScope, ev: DedicatedWorkerGlobalScopeEventMap[K]) => unknown, options?: boolean | EventListenerOptions): void
  postMessage: (message: unknown) => void

  // Shared Worker
  onconnect: ((this: SharedWorkerGlobalScope, ev: MessageEvent) => unknown) | null
  sharedWorkerPort: MessagePort

  // IPFS
  ipfs: IPFS & { libp2p: libp2p }
  service: MultiService<IPFSService>
  server: Server<IPFSService>

  apiEndpoint: string
  initiated: boolean
  monitorBitswap: (verbose: boolean) => void
  monitorPeers: () => void
  reconnect: (peer: string, backoff: Backoff, status: ConnectionStatus) => void
  stopMonitoringBitswap: () => void
  stopMonitoringPeers: () => void
}

declare const self: IPFSWorkerGlobalScope

// Global state
async function initPeers(): Promise<string[]> { return new Promise(resolve => resolve([])) }
let peers: string[] = []
initPeers().then(ps => { peers = ps }).catch(() => { })
// let peers: string[] = await initPeers()
// let peers: string[] = Promise.resolve([])

const latestPeerTimeoutIds: Record<string, unknown> = {}
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)


/** 🎛️ Connection interval knobs
 *
 * KEEP_ALIVE_INTERVAL: Interval to keep the connection alive when online
 * BACKOFF_INIT: Starting intervals for fibonacci backoff used when establishing a connection
 * KEEP_TRYING_INTERVAL: Interval to keep trying the connection when offline
 */

type Backoff = {
  retryNumber: number
  lastBackoff: number
  currentBackoff: number
}

const KEEP_ALIVE_INTERVAL =
  1 * 60 * 1000 // 1 minute

const BACKOFF_INIT = {
  retryNumber: 0,
  lastBackoff: 0,
  currentBackoff: 1000
}

const KEEP_TRYING_INTERVAL =
  5 * 60 * 1000 // 5 minutes



/** 🎛️ IPFS Options
 */

const OPTIONS: Options = {
  config: {
    Addresses: {
      Delegates: []
    },
    Bootstrap: [],
    Discovery: {
      webRTCStar: { Enabled: false }
    }
  },
  preload: {
    enabled: false
  },
  libp2p: {
    config: {
      peerDiscovery: { autoDial: false }
    }
  },
  init: {
    algorithm: isSafari ? "RSA" : undefined
  }
}


const main = async (port: MessagePort) => {
  // const IPFS = self.Ipfs
  self.initiated = true

  // Start listening to all the incoming connections (browsing contexts that
  // which run new SharedWorker...)
  // Note: It is important to start listening before we do any await to ensure
  // that connections aren't missed while awaiting.
  const connections = listen(self, "connect", {})

  // Fetch the list of peers
  // peers = await localforage.getItem("ipfsPeers")
  const storedPeers: string | null = await localforage.getItem("ipfsPeers")

  if (storedPeers) {
    peers = storedPeers.split(",")

    fetchPeers().then(list =>
      localforage.setItem("ipfsPeers", list.join(","))
    ).catch(() => { })

  } else {
    peers = await fetchPeers()
    await localforage.setItem("ipfsPeers", peers.join(","))

  }

  if (peers.length === 0) {
    throw new Error("💥 Couldn't start IPFS node, peer list is empty")
  }

  // Start an IPFS node & create server that will expose it's API to all clients
  // over message channel.
  const ipfs = await createIpfs(OPTIONS)
  const service = new IPFSService(ipfs) as unknown as MultiService<IPFSService>
  const server = new Server(service)

  self.ipfs = ipfs as unknown as IPFS & { libp2p: libp2p }
  self.service = service
  self.server = server

  peers.forEach(async peer => {
    latestPeerTimeoutIds[peer] = null
    await tryConnecting(peer)
  })

  console.log("🚀 Started IPFS node")

  // Connect every queued and future connection to the server.
  if (port) {
    server.connect(port)
    return
  }

  for await (const event of connections) {
    // @ts-ignore
    const p = event.ports && event.ports[0]
    if (p) server.connect(p)
  }
}


// Try connecting when browser comes online
self.addEventListener("online", () => {
  peers
    .filter(peer =>
      !peer.includes("/localhost/") &&
      !peer.includes("/127.0.0.1/") &&
      !peer.includes("/0.0.0.0/")
    )
    .forEach(peer => {
      void tryConnecting(peer)
    })
})


// PEERS
// -----

function fetchPeers() {
  const peersUrl = `${self.apiEndpoint}/ipfs/peers`

  return fetch(peersUrl)
    .then(r => r.json())
    .then(r => r.filter((p: string) => p.includes("/wss/")))
    .catch(e => { throw new Error("💥 Couldn't start IPFS node, failed to fetch peer list") })
}


// CONNECTIONS
// -----------

async function keepAlive(peer: string, backoff: Backoff, status: ConnectionStatus) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  if (backoff.currentBackoff < KEEP_TRYING_INTERVAL) {

    // Start race between reconnect and ping
    timeoutId = setTimeout(() => reconnect(peer, backoff, status), backoff.currentBackoff)
  } else {

    // Disregard backoff, but keep trying
    timeoutId = setTimeout(() => reconnect(peer, backoff, status), KEEP_TRYING_INTERVAL)
  }

  // Track the latest reconnect attempt
  latestPeerTimeoutIds[peer] = timeoutId

  self.ipfs.libp2p.ping(peer).then((latency: number) => {
    const updatedStatus: ConnectionStatus = { connected: true, lastConnectedAt: Date.now(), latency }
    report(peer, updatedStatus)

    // Cancel reconnect because ping won
    if (timeoutId) clearTimeout(timeoutId)

    // Keep alive after the latest ping-reconnect race, ignore the rest
    if (timeoutId === latestPeerTimeoutIds[peer]) {
      setTimeout(() => keepAlive(peer, BACKOFF_INIT, updatedStatus), KEEP_ALIVE_INTERVAL)
    }
  }).catch(() => { })
}


async function reconnect(peer: string, backoff: Backoff, status: ConnectionStatus) {
  const updatedStatus = { ...status, connected: false, latency: null }
  report(peer, updatedStatus)

  try {
    await self.ipfs.swarm.disconnect(peer)
    await self.ipfs.swarm.connect(peer)
  } catch {
    // No action needed, we will retry
  }

  if (backoff.currentBackoff < KEEP_TRYING_INTERVAL) {
    const nextBackoff = {
      retryNumber: backoff.retryNumber + 1,
      lastBackoff: backoff.currentBackoff,
      currentBackoff: backoff.lastBackoff + backoff.currentBackoff
    }

    void keepAlive(peer, nextBackoff, updatedStatus)
  } else {
    void keepAlive(peer, backoff, updatedStatus)
  }
}


async function tryConnecting(peer: string) {
  self
    .ipfs.libp2p.ping(peer)
    .then((latency: number) => {

      return self.ipfs.swarm
        .connect(peer, { timeout: 1 * 1000 })
        .then(() => {
          console.log(`🪐 Connected to ${peer}`)

          const status = { connected: true, lastConnectedAt: Date.now(), latency }
          report(peer, status)

          // Ensure permanent connection to Fission gateway
          // TODO: This is a temporary solution while we wait for
          //       https://github.com/libp2p/js-libp2p/issues/744
          //       (see "Keep alive" bit)
          setTimeout(() => keepAlive(peer, BACKOFF_INIT, status), KEEP_ALIVE_INTERVAL)
        })
    })
    .catch(() => {
      console.log(`🪓 Could not connect to ${peer}`)

      const status = { connected: false, lastConnectedAt: 0, latency: null }
      report(peer, status)

      void keepAlive(peer, BACKOFF_INIT, status)
    })
}


self.reconnect = reconnect


// REPORTING
// ---------

type ConnectionStatus = {
  connected: boolean
  lastConnectedAt: number
  latency: number | null
}

let peerConnections: ({ peer: string } & ConnectionStatus)[] = []
let monitoringPeers = false

function report(peer: string, status: ConnectionStatus) {
  peerConnections = peerConnections
    .filter(connection => connection.peer !== peer)
    .concat({ peer, ...status })

  const offline = peerConnections.every(connection => !connection.connected)
  const lastConnectedAt = peerConnections.reduce((newest, connection) =>
    newest >= connection.lastConnectedAt ? newest : connection.lastConnectedAt,
    0
  )

  const activeConnections = peerConnections.filter(connection => connection.latency !== null)
  const averageLatency = activeConnections.length > 0
    ? activeConnections.reduce((sum, connection) => sum + (connection.latency ?? 0), 0) / activeConnections.length
    : null

  if (typeof SharedWorkerGlobalScope === "function") {
    self.sharedWorkerPort.postMessage({ offline, averageLatency })
  } else {
    self.postMessage({ offline, averageLatency })
  }

  if (monitoringPeers) {
    console.table(peerConnections)
    console.log("offline", offline)
    console.log("last connected at", lastConnectedAt === 0 ? null : lastConnectedAt)
    console.log("average latency", averageLatency)
  }
}


async function monitorPeers() {
  monitoringPeers = true
  console.log("📡 Monitoring IPFS peers")
}


function stopMonitoringPeers() {
  monitoringPeers = false
}


self.monitorPeers = monitorPeers
self.stopMonitoringPeers = stopMonitoringPeers


// 🔮


let monitor: number


// async function asyncIteratorToArray(it) {
//   const chunks = []

//   for await (const chunk of it) {
//     chunks.push(chunk)
//   }

//   return chunks
// }


async function monitorBitswap(verbose: boolean) {
  const cids: Record<string, number> = {}
  const seen: string[] = []

  verbose = verbose === undefined ? false : true

  console.log("🕵️‍♀️ Monitoring IPFS bitswap requests")
  await stopMonitoringBitswap()

  monitor = self.setInterval(async () => {
    const peerList = await Promise.resolve(peers)

    peerList.map(async peer => {
      const peerId = peer.split("/").reverse()[0]
      const wantList = await self.ipfs.bitswap.wantlistForPeer(peerId, { timeout: 120 * 1000 })

      wantList.forEach(async cid => {
        const c = cid.toString()
        const s = peerId + "-" + c

        if (!seen.includes(s)) {
          const seenCid = !!cids[c]
          const emoji = seenCid ? "📡" : "🔮"
          const msg = `${emoji} Peer ${peerId} requested CID ${c}`

          cids[c] = (cids[c] || 0) + 1

          if (seenCid) {
            if (verbose) console.log(msg + ` (#${cids[c]})`)
            return
          } else {
            console.log(msg)
          }

          const start = performance.now()
          seen.push(s)

          const dag = await self.ipfs.dag.get(cid)
          const end = performance.now()
          const diff = end - start
          const loaded = `loaded locally in ${diff.toFixed(2)} ms`

          if (dag.value.Links) {
            console.log(`🧱 ${c} is a 👉 DAG structure (${loaded})`)
              ; (console.table || console.log)(
                dag.value.Links.map((l: PBLink) => {
                  return { name: l.Name, cid: l.Hash.toString() }
                })
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


async function stopMonitoringBitswap() {
  if (monitor) clearInterval(monitor)
}


self.monitorBitswap = monitorBitswap
self.stopMonitoringBitswap = stopMonitoringBitswap



// 🚀


/**
 * Creates an AsyncIterable<Event> for all the events on the given `target` for
 * the given event `type`. It is like `target.addEventListener(type, listener, options)`
 * but instead of passing listener you get `AsyncIterable<Event>` instead.
 * @param {EventTarget} target
 * @param {string} type
 * @param {AddEventListenerOptions} options
 */
const listen = function (target: EventTarget, type: string, options: AddEventListenerOptions) {
  const events: Event[] = []
  let resume: (value: unknown) => void
  let ready = new Promise(resolve => (resume = resolve))

  const write = (event: Event) => {
    events.push(event)
    // resume()
    resume(null)
  }

  const read = async (): Promise<Event[]> => {
    await ready
    ready = new Promise(resolve => (resume = resolve))
    return events.splice(0)
  }

  const reader = async function* () {
    try {
      while (true) {
        yield* await read()
      }
    } finally {
      target.removeEventListener(type, write, options)
    }
  }

  target.addEventListener(type, write, options)
  return reader()
}


if (typeof SharedWorkerGlobalScope === "function") {
  self.onconnect = event => {
    // Default shared worker port
    self.sharedWorkerPort = event.ports[0]

    self.sharedWorkerPort.onmessage = async event => {
      const { endpoint } = event.data

      self.apiEndpoint = endpoint

      // Initialize IPFS with non-default message port
      if (!self.initiated) await main(event.ports && event.ports[0])
      self.sharedWorkerPort.onmessage = null
    }
  }
} else {
  self.addEventListener("message", setup)
}

async function setup(event: MessageEvent) {
  const { endpoint } = event.data

  self.apiEndpoint = endpoint

  // Initialize IPFS with message port
  if (!self.initiated) await main(event.ports && event.ports[0])
  self.removeEventListener("message", setup)
}