import * as did from "../did/index.js"
import { setup } from "../setup/internal.js"
import { LinkingError } from "./linking.js"

import type { Maybe } from "../common/index.js"

export type Channel = {
  send: (data: ChannelData) => void
  close: () => void
}

export type ChannelOptions = {
  username: string
  handleMessage: (event: MessageEvent) => void
}

type ChannelData = string | ArrayBufferLike | Blob | ArrayBufferView

export const createWssChannel = async (options: ChannelOptions): Promise<Channel> => {
  const { username, handleMessage } = options

  const rootDid = await await did.root(username).catch(() => null)
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
  socket.onclose = ev => console.log("close", ev)
  socket.onerror = ev => console.log("err", ev)

  const send = publishOnWssChannel(socket)
  const close = closeWssChannel(socket)

  return {
    send,
    close
  }
}

const waitForOpenConnection = async (socket: WebSocket): Promise<void> => {
  return new Promise((resolve, reject) => {
    socket.onopen = () => {
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

export const publishOnWssChannel = (socket: WebSocket): (data: ChannelData) => void => {
  return function (data: ChannelData) {
    const binary = typeof data === "string"
      ? new TextEncoder().encode(data).buffer
      : data

    socket?.send(binary)
  }
}