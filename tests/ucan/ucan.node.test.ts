import expect from "expect"
import RSAKeyStore from "keystore-idb/rsa/keystore.js"
import { webcrypto } from "one-webcrypto"

import * as base64 from "../../src/common/base64.js"
import * as did from "../../src/did/index.js"
import * as keystore from "../../src/keystore.js"
import * as ucan from "../../src/ucan/index.js"

import InMemoryRSAKeyStore from "../../src/setup/node/keystore/store/memory.js"


describe("UCAN", () => {

  it("can be built", async function() {
    const u = await ucan.build({
      audience: await randomRsaDid(),
      issuer: await did.ucan()
    })

    expect(await ucan.isValid(u)).toBe(true)
  })

  it("can validate a UCAN with a valid proof", async function() {
    const storeA = (await InMemoryRSAKeyStore.init()) as unknown as RSAKeyStore
    const storeB = (await InMemoryRSAKeyStore.init()) as unknown as RSAKeyStore

    await keystore.set(storeB)
    const issB = await did.ucan()

    // Proof
    await keystore.set(storeA)
    const issA = await did.ucan()
    const prf = await ucan.build({
      audience: issB,
      issuer: issA
    })

    // Shell
    await keystore.set(storeB)
    const u = await ucan.build({
      audience: await randomRsaDid(),
      issuer: issB,
      proof: ucan.encode(prf)
    })

    expect(await ucan.isValid(u)).toBe(true)
  })

  it("can validate a UCAN with a sessionKey fact", async function() {
    const sessionKey = "RANDOM KEY"
    const u = await ucan.build({
      issuer: await did.ucan(),
      audience: await randomRsaDid(),
      lifetimeInSeconds: 60 * 5, // 5 minutes
      facts: [{ sessionKey }]
    })

    expect(await ucan.isValid(u)).toBe(true)
  })

  it("decodes and reencodes UCAN to the same value", async function() {
    const u = "eyJ1YXYiOiIxLjAuMCIsImFsZyI6IkVkRFNBIiwiY3R5IjpudWxsLCJ0eXAiOiJKV1QifQ.eyJwdGMiOiJBUFBFTkQiLCJuYmYiOjE2MTg0MjU4NzYsInJzYyI6eyJ3bmZzIjoiLyJ9LCJleHAiOjE2MTg0MjU5MzYsImlzcyI6ImRpZDprZXk6ejZNa3BoTWtYc24ybzVnN2E4M292MndjalBOeXNkZXlNMm9CdEVaUlphRXJqSlU1IiwicHJmIjpudWxsLCJhdWQiOiJkaWQ6a2V5Ono2TWtnWUdGM3RobjhrMUZ2NHA0ZFdYS3RzWENuTEg3cTl5dzRRZ05QVUxEbURLQiIsImZjdCI6W119.DItB729fJHKYhVuhjpXFOyqJeJwSpa8y5cAvbkdzzTbKTUEpKv5YfgKn5FWKzY_cnCeCLjqL_Zw9gto7kPqVCw"
    const decoded = ucan.decode(u)
    const reencoded = ucan.encode(decoded)

    expect(u === reencoded).toBe(true)
  })

})


async function randomRsaDid(): Promise<string> {
  const key = await webcrypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([ 0x01, 0x00, 0x01 ]),
      hash: "SHA-256"
    },
    false,
    [ "sign", "verify" ]
  )

  const a = await webcrypto.subtle.exportKey("spki", key.publicKey)
  const b = String.fromCharCode(...(new Uint8Array(a)))
  const c = base64.encode(b)

  return did.publicKeyToDid(c, did.KeyType.RSA)
}