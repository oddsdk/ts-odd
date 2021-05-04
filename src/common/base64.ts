export function decode(base64: string): string {
  return Buffer.from(base64, 'base64').toString('binary')
}

export function encode(str: string): string {
  return Buffer.from(str, 'binary').toString('base64')
}

export function urlDecode(base64: string): string {
  return decode(makeUrlUnsafe(base64))
}

export function urlEncode(str: string): string {
  return makeUrlSafe(encode(str))
}

export function makeUrlSafe(a: string): string {
  return a.replace(/\//g, "_").replace(/\+/g, "-").replace(/=+$/, "")
}

export function makeUrlUnsafe(a: string): string {
  return a.replace(/_/g, "/").replace(/-/g, "+")
}
