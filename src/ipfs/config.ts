import { IPFSClient } from "ipfs-message-port-client"
import type { IPFS } from "ipfs-core"

import { setup } from "../setup/internal.js"


let ipfs: IPFS | null = null


export const set = (userIpfs: unknown): void => {
  ipfs = userIpfs as IPFS
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
