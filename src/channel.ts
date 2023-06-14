import type { Maybe } from "./common/types.js"


// TYPES


export type Channel = {
  close: () => void
  send: (data: ChannelData) => void
}

export type ChannelOptions = {
  handleMessage: (event: MessageEvent) => void
}

export type ChannelData = string | ArrayBufferLike | Blob | ArrayBufferView



// FUNCTIONS


export const createWssChannel = async (
  socketEndpoint: string,
  options: ChannelOptions
): Promise<Channel> => {
  const { handleMessage } = options

  // TODO: If debug: console.log("Opening channel")

  const socket: Maybe<WebSocket> = new WebSocket(socketEndpoint)
  await waitForOpenConnection(socket)
  socket.onmessage = handleMessage

  const send = publishOnWssChannel(socket)
  const close = closeWssChannel(socket)

  return {
    send,
    close
  }
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
