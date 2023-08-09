////////
// 🧩 //
////////

export type Channel = {
  close: () => void
  send: (data: ChannelData) => void
}

export type ChannelOptions<Context> = {
  context: Context
  onmessage: (event: MessageEvent) => void
}

export type ChannelData = string | ArrayBufferLike | Blob | ArrayBufferView
