////////
// 🧩 //
////////

export type Channel = {
  close: () => void
  send: (data: ChannelData) => void
}

export type ChannelOptions = {
  onmessage: (event: MessageEvent, channel: Channel) => void
  topic: string
}

export type ChannelData = string | ArrayBufferLike | Blob | ArrayBufferView
