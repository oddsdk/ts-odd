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

export type ChannelData = string | ArrayBufferLike | Blob | ArrayBufferView

export const createWssChannel = async (options: ChannelOptions): Promise<Channel> => {
  const { username, handleMessage } = options

  const rootDid = await waitForRootDid(username)
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

  const send = publishOnWssChannel(socket)
  const close = closeWssChannel(socket)

  return {
    send,
    close
  }
}

const waitForRootDid = async (username: string): Promise<string | null> => {
  let rootDid: string | null = await did.root(username)
  if (rootDid) {
    return rootDid
  }

  return new Promise((resolve) => {
    const maxRetries = 3
    let tries = 0

    const rootDidInterval = setInterval(async () => {
      console.log("Could not fetch root DID. Retrying")
      rootDid = await did.root(username).catch((e) => {
        clearInterval(rootDidInterval)
        throw e
      })

      if (!rootDid && tries < maxRetries) {
        tries++
        return
      }

      clearInterval(rootDidInterval)
      resolve(rootDid)
    }, 2000)
  })
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
