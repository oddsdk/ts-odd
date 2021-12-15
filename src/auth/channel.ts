import * as did from "../did/index.js"
import * as storage from "../storage/index.js"
import * as ucan from "../ucan/index.js"
import { setup } from "../setup/internal.js"

type ChannelState = {
  socket: WebSocket | null
  topic: string
}

const cs: ChannelState = {
  socket: null,
  topic: ""
}

const resetChannelState = (): void => {
  cs.socket = null
  cs.topic = ""
}

export const openWssChannel = async (maybeUsername: string, handleMessage: (this: WebSocket, ev: MessageEvent) => any): Promise<void> => {
  resetChannelState()

  const rootDid = await lookupRootDid(maybeUsername).catch(_ => null)
  if (!rootDid) {
    return
  }

  const apiEndpoint = setup.getApiEndpoint()
  const endpoint = apiEndpoint.replace(/^https?:\/\//, "wss://")
  const topic = `deviceLink#${rootDid}`
  console.log("Opening channel", topic)
  cs.topic = topic
  cs.socket = new WebSocket(`${endpoint}/user/link/${rootDid}`)
  cs.socket.onmessage = handleMessage
}

export const closeWssChannel = async (): Promise<void> => {
  console.log("Closing channel")
  if (cs.socket) {
    cs.socket.close(1000)
  }

  resetChannelState()
}

export const handleMessage = (ev: MessageEvent): any => {
  console.log(ev)
  return null
}

export const publishOnWssChannel = (data: any): void => {
  const binary = typeof data === "string"
    ? new TextEncoder().encode(data).buffer
    : data
  
    cs.socket?.send(binary)
}

// ⛑ Helpers

const rootDidCache: Record<string, string> = {}

const lookupRootDid = async (maybeUsername: string | null) => {
  let x, y

  const maybeUcan: string | null = await storage.getItem("ucan")
  if (maybeUsername) {
    x = maybeUsername
    y = rootDidCache[x] || (await did.root(x))
  } else if (maybeUcan) {
    x = "ucan"
    y = rootDidCache[x] || ucan.rootIssuer(maybeUcan)
  } else {
    x = "local"
    y = rootDidCache[x] || (await did.write())
  }
  return y
}
