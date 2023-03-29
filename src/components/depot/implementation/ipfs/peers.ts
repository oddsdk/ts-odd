import { multiaddr, Multiaddr } from "@multiformats/multiaddr"

import * as Storage from "../../../../components/storage/implementation.js"
import * as TypeChecks from "../../../../common/type-checks.js"


export function fetchPeers(peersUrl: string): Promise<string[]> {
  return fetch(peersUrl)
    .then(r => r.json())
    .then(r => Array.isArray(r) ? r : [])
    .then(r => r.filter(p => TypeChecks.isString(p) && p.includes("/wss/")))
    .catch(() => { throw new Error("💥 Failed to fetch peer list") })
}


export async function listPeers(
  storage: Storage.Implementation,
  peersUrl: string
): Promise<Multiaddr[]> {
  let peers

  const storageKey = `ipfs-peers-${peersUrl}`
  const maybePeers = await storage.getItem(storageKey)

  if (TypeChecks.isString(maybePeers) && maybePeers.trim() !== "") {
    peers = JSON.parse(maybePeers)

    fetchPeers(peersUrl).then(list =>
      storage.setItem(storageKey, JSON.stringify(list))
    ).catch(err => {
      // don't throw
      console.error(err)
    })

  } else {
    peers = await fetchPeers(peersUrl)
    await storage.setItem(storageKey, JSON.stringify(peers))

  }

  return peers.map(multiaddr)
}