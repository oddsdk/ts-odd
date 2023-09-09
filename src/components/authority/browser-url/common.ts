import { xchacha20poly1305 } from "@noble/ciphers/chacha"
import { x25519 } from "@noble/curves/ed25519"
import { hkdf } from "@noble/hashes/hkdf"
import { sha256 } from "@noble/hashes/sha256"
import { varint } from "iso-base/varint"
import { base58btc } from "multiformats/bases/base58"
import * as Uint8Arrays from "uint8arrays"

import { isBlob, isObject, isString } from "../../../common/type-checks.js"

////////
// 🏔️️ //
////////

export const CIPHER_TEXT_ENCODING = "base64url"
export const DOMAIN_SEPARATION_TAG = Uint8Arrays.fromString(
  "oddjs-qr-code",
  "utf8"
)

export const INITIAL_NONCE = new Uint8Array(0)

////////
// 🧩️ //
////////

export type Cipher = ReturnType<typeof makeCipher>["cipher"]

export type Msg = {
  did: string
  payload: string
  step: string
} & Record<string, unknown>

export type ProvideResponse = {
  url: string
}

export type RequestResponse = {}

export type Step = "handshake" | "query" | "fin"
export type StepResult = { nextNonce: Uint8Array; nextStep: Step }

////////
// 🛠️ //
////////

export async function decodeChannelData(
  data: unknown
): Promise<Msg | null> {
  let json

  data = isBlob(data) ? await data.text() : data

  if (!isString(data)) {
    console.warn(`Received a message, but got a non-string message.`)
    return null
  }

  try {
    json = JSON.parse(data)
  } catch (err) {
    console.warn(`Received a message, but couldn't decode it as JSON:`, err)
    return null
  }

  if (!isObject(json)) {
    console.warn(`Received a message, but got some JSON that is not an object.`, json)
    return null
  }

  if (!isString(json.did)) {
    console.warn(`Received a message, but got some JSON that does not have the \`did\` property.`)
    return null
  }

  if (!isString(json.step)) {
    console.warn(`Received a message, but got some JSON that does not have the \`step\` property.`)
    return null
  }

  if (!isString(json.payload)) {
    console.warn(`Received a message, but got some JSON that does not have the \`payload\` property.`)
    return null
  }

  return {
    ...json,
    did: json.did,
    payload: json.payload,
    step: json.step,
  }
}

export function decryptPayload(
  cipher: Cipher,
  encryptedPayload: string
): Uint8Array {
  return cipher.decrypt(
    Uint8Arrays.fromString(
      encryptedPayload,
      CIPHER_TEXT_ENCODING
    )
  )
}

export function decryptJSONPayload(
  cipher: Cipher,
  encryptedPayload: string
) {
  return JSON.parse(
    Uint8Arrays.toString(
      decryptPayload(cipher, encryptedPayload),
      "utf8"
    )
  )
}

export function encryptPayload(
  cipher: Cipher,
  payload: Uint8Array
): string {
  return Uint8Arrays.toString(
    cipher.encrypt(
      payload
    ),
    CIPHER_TEXT_ENCODING
  )
}

export function encryptJSONPayload(
  cipher: Cipher,
  payload: unknown
) {
  return encryptPayload(
    cipher,
    Uint8Arrays.fromString(
      JSON.stringify(payload),
      "utf8"
    )
  )
}

export function makeCipher(
  { nonce, ourPrivateKey, producerPublicKey, remotePublicKey }: {
    nonce: Uint8Array
    ourPrivateKey: Uint8Array
    producerPublicKey: Uint8Array
    remotePublicKey: Uint8Array
  }
) {
  const sharedSecret = x25519.getSharedSecret(ourPrivateKey, remotePublicKey)
  const hashedNonce = sha256(nonce)

  const okm = hkdf(
    sha256,
    sharedSecret,
    producerPublicKey,
    Uint8Arrays.concat([
      DOMAIN_SEPARATION_TAG,
      Uint8Arrays.fromString(":", "utf8"),
      hashedNonce,
    ]),
    32 + 24 + hashedNonce.length // length = ChaCha key + IV + next-nonce
  )

  const xChaChaKey = okm.slice(0, 32)
  const iv = okm.slice(32, 32 + 24)

  return {
    cipher: xchacha20poly1305(xChaChaKey, iv),
    nextNonce: okm.slice(32 + 24),
  }
}

export function publicKeyFromDID(did: string) {
  const encodedPublicKey = base58btc.decode(did.replace(/^did\:key\:/, ""))
  const [_code, size] = varint.decode(encodedPublicKey)
  return encodedPublicKey.slice(size)
}
