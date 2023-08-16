import { Channel, ChannelData, ChannelOptions } from "../channel.js"
import { Manners } from "../components.js"

////////
// 🛠️ //
////////

export const createWebsocketChannel = async <Context, FS>(
  manners: Manners.Implementation<FS>,
  socketEndpoint: string,
  options: ChannelOptions<Context>
): Promise<Channel> => {
  const { onmessage } = options

  const socket = new WebSocket(socketEndpoint)
  await waitForOpenConnection(socket)
  socket.onmessage = onmessage
  manners.log("📣 Channel established", socket)

  return {
    send: publish(socket),
    close: close(socket),
  }
}

const waitForOpenConnection = async (socket: WebSocket): Promise<void> => {
  return new Promise((resolve, reject) => {
    socket.onopen = () => resolve()
    socket.onerror = () => reject("Websocket channel could not be opened")
  })
}

export const close = (socket: WebSocket): () => void => {
  return () => socket.close(1000)
}

export const publish = (socket: WebSocket): (data: ChannelData) => void => {
  return function(data: ChannelData) {
    const binary = typeof data === "string"
      ? new TextEncoder().encode(data).buffer
      : data

    socket.send(binary)
  }
}
