export function base64UrlDecode(a: string) {
  return atob(a).replace(/\_/g, "/").replace(/\-/g, "+")
}

export function base64UrlEncode(b: string) {
  return makeBase64UrlSafe(btoa(b))
}

export function makeBase64UrlSafe(a: string) {
  return a.replace(/\//g, "_").replace(/\+/g, "-").replace(/=+$/, "")
}
