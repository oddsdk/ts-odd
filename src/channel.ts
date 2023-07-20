////////
// 🧩 //
////////

export type Channel = {
  close: () => void
  send: (data: ChannelData) => void
}

export type ChannelOptions = {
  handleMessage: (event: MessageEvent) => void
}

export type ChannelData = string | ArrayBufferLike | Blob | ArrayBufferView
