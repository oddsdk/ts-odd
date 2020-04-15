import { KeyStore } from 'keystore-idb/types'


// CONSTANTS


export const API_ENDPOINT = 'https://runfission.com'



// BASE64


export function base64UrlDecode(a: string): string {
  return atob(a).replace(/\_/g, "/").replace(/\-/g, "+")
}

export function base64UrlEncode(b: string): string {
  return makeBase64UrlSafe(btoa(b))
}

export function makeBase64UrlSafe(a: string): string {
  return a.replace(/\//g, "_").replace(/\+/g, "-").replace(/=+$/, "")
}



// CRYPTO


export function isRSAKeystore(ks: KeyStore): boolean {
  return ks.writeKey.privateKey.algorithm.name.startsWith("RSA")
}
