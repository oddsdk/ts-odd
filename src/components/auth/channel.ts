import * as Reference from "../reference/implementation.js"
import type { Maybe } from "../../common/types.js"


// TYPES


export type Channel = {
  close: () => void
  send: (data: ChannelData) => void
}

export type ChannelOptions = {
  handleMessage: (event: MessageEvent) => void
  username: string
}

export type ChannelData = string | ArrayBufferLike | Blob | ArrayBufferView



// FUNCTIONS


export const createWssChannel = async (
  reference: Reference.Implementation,
  socketEndpoint: ({ rootDID }: { rootDID: string }) => string,
  options: ChannelOptions
): Promise<Channel> => {
  const { username, handleMessage } = options

  const rootDID = await waitForRootDid(reference, username)
  if (!rootDID) {
    throw new Error(`Failed to lookup DID for ${username}`)
  }

  const topic = `deviceLink#${rootDID}`
  console.log("Opening channel", topic)

  const socket: Maybe<WebSocket> = new WebSocket(socketEndpoint({ rootDID }))
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
  let rootDid = await reference.didRoot.lookup(username).catch(() => {
    console.warn("Could not fetch root DID. Retrying.")
    return null
  })
  if (rootDid) {
    return rootDid
  }

  return new Promise((resolve, reject) => {
    const maxRetries = 10
    let tries = 0

    const rootDidInterval = setInterval(async () => {
      rootDid = await reference.didRoot.lookup(username).catch(() => {
        console.warn("Could not fetch root DID. Retrying.")
        return null
      })

      if (!rootDid && tries < maxRetries) {
        tries++
        return
      } else if (!rootDid && tries === maxRetries) {
        reject("Failed to fetch root DID.")
      }

      clearInterval(rootDidInterval)
      resolve(rootDid)
    }, 1000)
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
