export const toBuffer = async (blob: Blob): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const fail: (() => void) = () => reject(new Error("Failed to read file"))
    const reader = new FileReader()
    reader.addEventListener('load', (e) => {
      const arrbuf = e?.target?.result || null
      if (arrbuf === null) {
        fail()
      }
      resolve(Buffer.from(arrbuf as ArrayBuffer))
    })
    reader.addEventListener('error', () => reader.abort())
    reader.addEventListener('abort', fail)
    reader.readAsArrayBuffer(blob)
  })
}
