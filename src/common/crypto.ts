import utils from 'keystore-idb/utils'

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const view = new Uint8Array(hex.length / 2)

  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }

  return view.buffer
}

export const sha256 = async (buf: ArrayBuffer): Promise<ArrayBuffer> => {
  return globalThis.crypto.subtle.digest(
    {
        name: "SHA-256",
    },
    buf
  )
}

export const sha512 = async (buf: ArrayBuffer): Promise<ArrayBuffer> => {
  return globalThis.crypto.subtle.digest(
    {
        name: "SHA-512",
    },
    buf
  )
}

export const sha256Str = async(str: string): Promise<string> => {
  const buf = utils.strToArrBuf(str, 8)
  const hash = await sha256(buf)
  return utils.arrBufToBase64(hash)
}
