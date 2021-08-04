import * as uint8arrays from "uint8arrays"

export const toUint8Array = async (blob: Blob): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const fail: (() => void) = () => reject(new Error("Failed to read file"))
    const reader = new FileReader()
    reader.addEventListener("load", (e) => {
      const arrbuf = e?.target?.result || null
      if (arrbuf == null) {
        fail()
        return
      }
      if (typeof arrbuf === "string") {
        resolve(uint8arrays.fromString(arrbuf))
        return
      }
      resolve(new Uint8Array(arrbuf))
    })
    reader.addEventListener("error", () => reader.abort())
    reader.addEventListener("abort", fail)
    reader.readAsArrayBuffer(blob)
  })
}
