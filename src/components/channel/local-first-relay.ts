import { Client } from "@localfirst/relay-client"
import * as Uint8Arrays from "uint8arrays"

import { sha256 } from "multiformats/hashes/sha2"
import { Channel, ChannelData, ChannelOptions } from "../../channel.js"
import { Manners } from "../../components.js"
import { Implementation } from "./implementation.js"

////////
// 🛠️ //
////////

export async function establish<FS>(
  manners: Manners.Implementation<FS>,
  did: string,
  url: string,
  options: ChannelOptions
): Promise<Channel> {
  const topicDigest = await sha256.digest(new TextEncoder().encode(options.topic))
  const topic = Uint8Arrays.toString(topicDigest.bytes, "base64url")

  const didDigest = await sha256.digest(new TextEncoder().encode(did))
  const didHash = Uint8Arrays.toString(didDigest.bytes, "base64url")

  return new Promise((resolve, reject) => {
    let s: WebSocket
    let client: Client

    const channel = {
      close: () => client.disconnectServer(),
      send: (data: ChannelData) => s.send(data),
    }

    client = new Client({ userName: didHash, url })
      .join(topic)
      .on("peer.connect", ({ socket }) => {
        s = socket as WebSocket

        // listen for messages
        socket.addEventListener("message", (message: MessageEvent) => {
          options.onmessage(message, channel)
        })

        // channel established
        manners.log("📣 Channel established", url)
        resolve(channel)
      })
      .on("error", () => {
        reject()
      })
  })
}

////////
// 🛳️ //
////////

export function implementation<FS>(
  manners: Manners.Implementation<FS>,
  did: string,
  url: string
): Implementation {
  return {
    establish: (...args) => establish(manners, did, url, ...args),
  }
}
