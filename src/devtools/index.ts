export function connect(extensionId: string) {
  console.log("connect called with extension id", extensionId)

  globalThis.postMessage({
    id: extensionId,
    type: "connected"
  })
  
}

export function disconnect(extensionId: string) {
  console.log("disconnect called with extension id", extensionId)

  globalThis.postMessage({
    id: extensionId,
    type: "disconnected"
  })
}