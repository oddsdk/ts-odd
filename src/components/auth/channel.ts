import * as did from "../../did/index.js"
import * as Reference from "../reference/implementation.js"
import { LinkingError } from "./linking.js"

import type { Maybe } from "../../common/types.js"


// TYPES


export type Channel = {
  close: () => void
  send: (data: ChannelData) => void
}

export type ChannelOptions = {
  socketEndpoint: ({ rootDID }: { rootDID: string }) => string
  handleMessage: (event: MessageEvent) => void
  username: string
}

export type ChannelData = string | ArrayBufferLike | Blob | ArrayBufferView



// FUNCTIONS


export const createWssChannel = async (
  reference: Reference.Implementation,
  options: ChannelOptions
): Promise<Channel> => {
  const { username, handleMessage } = options

  const rootDID = await waitForRootDid(reference, username)
  if (!rootDID) {
    throw new LinkingError(`Failed to lookup DID for ${username}`)
  }

  const topic = `deviceLink#${rootDID}`
  console.log("Opening channel", topic)

  const socket: Maybe<WebSocket> = new WebSocket(options.socketEndpoint({ rootDID }))
  await waitForOpenConnection(socket)
  socket.onmessage = handleMessage

  const send = publishOnWssChannel(socket)
  const close = closeWssChannel(socket)

  return {
    send,
    close
  }
}

const waitForRootDid = async (
  reference: Reference.Implementation,
  username: string,
): Promise<string | null> => {
  let rootDid: string | null = await reference.didRoot.lookup(username)
  if (rootDid) {
    return rootDid
  }

  return new Promise((resolve) => {
    const maxRetries = 3
    let tries = 0

    const rootDidInterval = setInterval(async () => {
      console.log("Could not fetch root DID. Retrying")
      rootDid = await reference.didRoot.lookup(username).catch((e) => {
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
    socket.onopen = () => resolve()
    socket.onerror = () => reject("Websocket channel could not be opened")
  })
}

export const closeWssChannel = (socket: Maybe<WebSocket>): () => void => {
  return function () {
    if (socket) socket.close(1000)
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
