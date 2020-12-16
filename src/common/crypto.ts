import utils from 'keystore-idb/utils'

export const sha256 = async (buf: ArrayBuffer): Promise<ArrayBuffer> => {
  return globalThis.crypto.subtle.digest(
    {
        name: "SHA-256",
    },
    buf
  )
}

export const sha256Str = async(str: string): Promise<string> => {
  const buf = utils.strToArrBuf(str, 8)
  const hash = await sha256(buf)
  return utils.arrBufToBase64(hash)
}
