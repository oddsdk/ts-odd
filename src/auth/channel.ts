import * as did from "../did/index.js"
import * as storage from "../storage/index.js"
import * as ucan from "../ucan/index.js"
import { setup } from "../setup/internal.js"
import { LinkingError } from "./linking.js"

import type { Maybe } from "../common/index.js"

export type Channel = {
  send: (data: any) => void
  receive: (event: MessageEvent) => any
  close: () => void
}

export type ChannelOptions = {
  username: string
  handleMessage: (event: MessageEvent) => any
}

export const createChannel = async (options: ChannelOptions): Promise<Channel> => {
  const { username, handleMessage } = options

  const rootDid = await lookupRootDid(username).catch(_ => null)
  if (!rootDid) {
    throw new LinkingError(`Failed to lookup DID for ${username}`)
  }

  const apiEndpoint = setup.getApiEndpoint()
  const endpoint = apiEndpoint.replace(/^https?:\/\//, "wss://")
  const topic = `deviceLink#${rootDid}`
  console.log("Opening channel", topic)

  const socket: Maybe<WebSocket> = new WebSocket(`${endpoint}/user/link/${rootDid}`)
  await waitForOpenConnection(socket)
  socket.onmessage = handleMessage
  // socket.onerror = () => { // reconnect }

  const send = publishOnWssChannel(socket)
  const close = closeWssChannel(socket)

  return {
    send,
    receive: handleMessage,
    close
  }
}

const waitForOpenConnection = async (socket: WebSocket): Promise<void> => {
  return new Promise((resolve, reject) => {
    socket.onopen = () => {
      console.log("socket is open")
      resolve()
    }
    socket.onerror = () => {
      reject("Websocket channel could not be opened")
    }
  })
}

export const closeWssChannel = (socket: Maybe<WebSocket>): () => void => {
  return function () {
    if (socket) {
      socket.close(1000)
    }
    socket = null
  }
}

export const publishOnWssChannel = (socket: WebSocket): (data: any) => void => {
  return function (data: any) {
    const binary = typeof data === "string"
      ? new TextEncoder().encode(data).buffer
      : data

    socket?.send(binary)
  }
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
