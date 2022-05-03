import { IPFSClient } from "ipfs-message-port-client"
import type { IPFS } from "ipfs-core"

import { EventEmitter } from "../common/event-emitter.js"
import { setup } from "../setup/internal.js"

export interface ConnectionStatusEventMap {
  "message": { offline: boolean; averageLatency: number }
}


let ipfs: IPFS | null = null


export const set = (userIpfs: unknown): void => {
  ipfs = userIpfs as IPFS
}

export const setLocalIpfs = async (): Promise<EventEmitter<ConnectionStatusEventMap>> => {
  const { port, connectionStatus } = await localIpfs()
  ipfs = IPFSClient.from(port) as unknown as IPFS 

  return connectionStatus
}

export function localIpfs(): Promise<{ port: MessagePort; connectionStatus: EventEmitter<ConnectionStatusEventMap> }> {
  return new Promise(resolve => {
    const workerURL = new URL("../workers/ipfs.worker.js", import.meta.url)
    const channel = new MessageChannel()
    const connectionStatus: EventEmitter<ConnectionStatusEventMap> = new EventEmitter()

    if (typeof SharedWorker === "function") {
      const sharedWorker = new SharedWorker(workerURL)

      sharedWorker.port.postMessage({ endpoint: setup.endpoints.api }, [ channel.port2 ])
      sharedWorker.port.onmessage = event => {
        const { offline, averageLatency } = event.data
        connectionStatus.emit("message", { offline, averageLatency })
      }

    } else {
      const worker = new Worker(workerURL)

      worker.postMessage({ endpoint: setup.endpoints.api }, [ channel.port2 ])
      worker.addEventListener("message", event => {
        const { offline, averageLatency } = event.data
        connectionStatus.emit("message", { offline, averageLatency })
      })
    }

    resolve({ port: channel.port1, connectionStatus })
  })
}

export const get = async (): Promise<IPFS> => {
  if (!ipfs) {
    const port = await iframe()
    ipfs = IPFSClient.from(port) as unknown as IPFS
  }
  return ipfs
}

export function iframe(): Promise<MessagePort> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe")
    iframe.id = "webnative-ipfs"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    iframe.style.display = "none"
    document.body.appendChild(iframe)

    iframe.onload = () => {
      const channel = new MessageChannel()
      channel.port1.onmessage = ({ ports }) => resolve(ports[0])
      iframe.contentWindow
        ? iframe.contentWindow.postMessage("connect", "*", [ channel.port2 ])
        : reject(new Error("Don't have access to iframe.contentWindow"))
    }

    iframe.src = `${setup.endpoints.lobby}/ipfs/v2.html`
  })
}
