export const equal = (aBuf: ArrayBuffer, bBuf: ArrayBuffer): boolean => {
  const a = new Uint8Array(aBuf)
  const b = new Uint8Array(bBuf)
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
