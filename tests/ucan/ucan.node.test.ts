import expect from "expect"
import { webcrypto } from "one-webcrypto"

import * as DID from "../../src/did/index.js"
import * as Ucan from "../../src/ucan/index.js"
import { components, createCryptoComponent } from "../helpers/components.js"


describe("UCAN", () => {

  const dependencies = { crypto: components.crypto }

  it("can be built", async function () {
    const u = await Ucan.build({
      dependencies,
      audience: await randomRsaDid(),
      issuer: await DID.ucan(components.crypto)
    })

    expect(await Ucan.isValid(components.crypto, u)).toBe(true)
  })

  it("can validate a UCAN with a valid proof", async function () {
    const cryptoOther = await createCryptoComponent()
    const cryptoMain = components.crypto

    const issB = await DID.ucan(cryptoMain)

    // Proof
    const issA = await DID.ucan(cryptoOther)
    const prf = await Ucan.build({
      dependencies: { crypto: cryptoOther },
      audience: issB,
      issuer: issA
    })

    // Shell
    const u = await Ucan.build({
      dependencies: { crypto: cryptoMain },
      audience: await randomRsaDid(),
      issuer: issB,
      proof: Ucan.encode(prf)
    })

    expect(await Ucan.isValid(components.crypto, u)).toBe(true)
  })

  it("can validate a UCAN with a sessionKey fact", async function () {
    const sessionKey = "RANDOM KEY"
    const u = await Ucan.build({
      dependencies,
      issuer: await DID.ucan(components.crypto),
      audience: await randomRsaDid(),
      lifetimeInSeconds: 60 * 5, // 5 minutes
      facts: [ { sessionKey } ]
    })

    expect(await Ucan.isValid(components.crypto, u)).toBe(true)
  })

  it("decodes and reencodes UCAN to the same value", async function () {
    const u = "eyJ1YXYiOiIxLjAuMCIsImFsZyI6IkVkRFNBIiwiY3R5IjpudWxsLCJ0eXAiOiJKV1QifQ.eyJwdGMiOiJBUFBFTkQiLCJuYmYiOjE2MTg0MjU4NzYsInJzYyI6eyJ3bmZzIjoiLyJ9LCJleHAiOjE2MTg0MjU5MzYsImlzcyI6ImRpZDprZXk6ejZNa3BoTWtYc24ybzVnN2E4M292MndjalBOeXNkZXlNMm9CdEVaUlphRXJqSlU1IiwicHJmIjpudWxsLCJhdWQiOiJkaWQ6a2V5Ono2TWtnWUdGM3RobjhrMUZ2NHA0ZFdYS3RzWENuTEg3cTl5dzRRZ05QVUxEbURLQiIsImZjdCI6W119.DItB729fJHKYhVuhjpXFOyqJeJwSpa8y5cAvbkdzzTbKTUEpKv5YfgKn5FWKzY_cnCeCLjqL_Zw9gto7kPqVCw"
    const decoded = Ucan.decode(u)
    const reencoded = Ucan.encode(decoded)

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

  const exportedKey = await webcrypto.subtle.exportKey("spki", key.publicKey)

  return DID.publicKeyToDid(
    components.crypto,
    new Uint8Array(exportedKey),
    "rsa"
  )
}