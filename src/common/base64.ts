export function urlDecode(a: string): string {
  return atob(a.replace(/_/g, "/").replace(/-/g, "+"))
}

export function urlEncode(b: string): string {
  return makeUrlSafe(btoa(b))
}

export function makeUrlSafe(a: string): string {
  return a.replace(/\//g, "_").replace(/\+/g, "-").replace(/=+$/, "")
}
