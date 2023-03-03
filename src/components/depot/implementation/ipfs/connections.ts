import { Libp2p } from "libp2p"
import { Multiaddr } from "@multiformats/multiaddr"


const latestPeerTimeoutIds: { [ peer: string ]: null | ReturnType<typeof setTimeout> } = {}


export type BackOff = {
  retryNumber: number
  lastBackoff: number
  currentBackoff: number
}

export type Status = {
  connected: boolean
  lastConnectedAt: number | null
  latency: number | null
}


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


export function keepAlive(libp2p: Libp2p, peer: Multiaddr, backoff: BackOff, status: Status): void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  if (backoff.currentBackoff < KEEP_TRYING_INTERVAL) {
    // Start race between reconnect and ping
    timeoutId = setTimeout(() => reconnect(libp2p, peer, backoff, status), backoff.currentBackoff)

  } else {
    // Disregard backoff, but keep trying
    timeoutId = setTimeout(() => reconnect(libp2p, peer, backoff, status), KEEP_TRYING_INTERVAL)

  }

  // Track the latest reconnect attempt
  latestPeerTimeoutIds[ peer.toString() ] = timeoutId

  ping(libp2p, peer).then(({ latency }) => {
    const updatedStatus = { connected: true, lastConnectedAt: Date.now(), latency }
    report(peer, updatedStatus)

    // Cancel reconnect because ping won
    if (timeoutId) clearTimeout(timeoutId)

    // Keep alive after the latest ping-reconnect race, ignore the rest
    if (timeoutId === latestPeerTimeoutIds[ peer.toString() ]) {
      setTimeout(() => keepAlive(libp2p, peer, BACKOFF_INIT, updatedStatus), KEEP_ALIVE_INTERVAL)
    }
  }).catch(() => {
    // ignore errors
  })
}


export async function reconnect(libp2p: Libp2p, peer: Multiaddr, backoff: BackOff, status: Status): Promise<void> {
  const updatedStatus = { ...status, connected: false, latency: null }

  report(peer, updatedStatus)

  try {
    await libp2p.hangUp(peer)
    await libp2p.dial(peer)
  } catch {
    // No action needed, we will retry
  }

  if (backoff.currentBackoff < KEEP_TRYING_INTERVAL) {
    const nextBackoff = {
      retryNumber: backoff.retryNumber + 1,
      lastBackoff: backoff.currentBackoff,
      currentBackoff: backoff.lastBackoff + backoff.currentBackoff
    }

    keepAlive(libp2p, peer, nextBackoff, updatedStatus)
  } else {
    keepAlive(libp2p, peer, backoff, updatedStatus)
  }
}


export function resetPeerTimeoutsTracking(peer: Multiaddr): void {
  latestPeerTimeoutIds[ peer.toString() ] = null
}


export function tryConnecting(libp2p: Libp2p, peer: Multiaddr, logging: boolean): void {
  ping(libp2p, peer).then(({ latency }) => {
    return libp2p
      .dial(peer)
      .then(() => {
        if (logging) console.log(`🪐 Connected to ${peer}`)

        const status = { connected: true, lastConnectedAt: Date.now(), latency }
        report(peer, status)

        // Ensure permanent connection to a peer
        // NOTE: This is a temporary solution while we wait for
        //       https://github.com/libp2p/js-libp2p/issues/744
        //       (see "Keep alive" bit)
        setTimeout(() => keepAlive(libp2p, peer, BACKOFF_INIT, status), KEEP_ALIVE_INTERVAL)
      })

  }).catch(() => {
    if (logging) console.log(`🪓 Could not connect to ${peer}`)

    const status = { connected: false, lastConnectedAt: null, latency: null }

    report(peer, status)
    keepAlive(libp2p, peer, BACKOFF_INIT, status)

  })
}


export async function ping(libp2p: Libp2p, peer: Multiaddr): Promise<{ latency: number }> {
  return libp2p.ping(peer).then(latency => ({ latency }))
}



// REPORTING
// ---------

let peerConnections: { peer: Multiaddr; status: Status }[] = []
let monitoringPeers = false


export function report(peer: Multiaddr, status: Status): void {
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
