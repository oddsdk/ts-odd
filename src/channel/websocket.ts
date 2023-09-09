import { Channel, ChannelData, ChannelOptions } from "../channel.js"
import { Manners } from "../components.js"

////////
// 🛠️ //
////////

export const createWebsocketChannel = async <FS>(
  manners: Manners.Implementation<FS>,
  socketEndpoint: string,
  options: ChannelOptions
): Promise<Channel> => {
  const { onmessage } = options

  const socket = new WebSocket(socketEndpoint)
  await waitForOpenConnection(socket)
  manners.log("📣 Channel established", socket)

  const channel = {
    send: publish(socket),
    close: close(socket),
  }

  socket.onmessage = event => onmessage(event, channel)

  return channel
}

const waitForOpenConnection = async (socket: WebSocket): Promise<void> => {
  return new Promise((resolve, reject) => {
    socket.onopen = () => resolve()
    socket.onerror = () => reject("Websocket channel could not be opened")
  })
}

export const close = (socket: WebSocket): () => void => {
  return () => socket.close()
}

export const publish = (socket: WebSocket): (data: ChannelData) => void => {
  return function(data: ChannelData) {
    socket.send(data)
  }
}
