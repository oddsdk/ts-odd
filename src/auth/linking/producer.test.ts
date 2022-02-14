import expect from "expect"
import * as fc from "fast-check"
import aes from "keystore-idb/lib/aes/index.js"
import { SymmAlg } from "keystore-idb/lib/types.js"
import utils from "keystore-idb/lib/utils.js"

import * as did from "../../../src/did/index.js"
import * as producer from "./producer.js"
import * as ucan from "../../ucan/index.js"

describe("generate session key", async () => {
  let DID: string

  beforeEach(async () => {
    DID = await did.ucan()
  })

  it("generates a session key and a session key message", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(DID)

    expect(sessionKey).toBeDefined()
    expect(sessionKey).not.toBeNull()
    expect(sessionKeyMessage).toBeDefined()
    expect(sessionKeyMessage).not.toBeNull()
  })

  it("generates a session key message that can be decrypted with the session key", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(DID)
    const { iv, msg } = JSON.parse(sessionKeyMessage)

    expect(async () => { await aes.decrypt(msg, sessionKey, { alg: SymmAlg.AES_GCM, iv: iv }) }).not.toThrow()
  })

  it("generates a valid closed UCAN", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(DID)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aes.decrypt(msg, sessionKey, { alg: SymmAlg.AES_GCM, iv: iv })
    const decodedUcan = ucan.decode(encodedUcan)

    expect(await ucan.isValid(decodedUcan)).toBe(true)
  })

  it("generates a closed UCAN without any potency", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(DID)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aes.decrypt(msg, sessionKey, { alg: SymmAlg.AES_GCM, iv: iv })
    const decodedUcan = ucan.decode(encodedUcan)

    expect(await decodedUcan.payload.ptc).toBe(null)
  })

  it("generates a closed UCAN with the session key in its facts", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(DID)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aes.decrypt(msg, sessionKey, { alg: SymmAlg.AES_GCM, iv: iv })
    const decodedUcan = ucan.decode(encodedUcan)
    const sessionKeyFromFact = decodedUcan.payload.fct[0] && decodedUcan.payload.fct[0].sessionKey
    const exportedSessionKey = await aes.exportKey(sessionKey)

    expect(sessionKeyFromFact).not.toBe(null)
    expect(exportedSessionKey === sessionKeyFromFact).toBe(true)
  })
})

describe("handle user challenge", async () => {
  let DID: string
  let sessionKey: CryptoKey
  let sessionKeyNoise: CryptoKey

  beforeEach(async () => {
    DID = await did.ucan()
    sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
    sessionKeyNoise = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
  })

  it("challenge message pin and audience match original pin and audience", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pin: fc.uint8Array({ min: 0, max: 9, minLength: 6, maxLength: 6 }),
          iv: fc.uint8Array({ minLength: 16, maxLength: 16 }).map(arr => arr.buffer)
        }), async ({ pin, iv }) => {
          const msg = await aes.encrypt(JSON.stringify({ did: DID, pin }), sessionKey, { iv, alg: SymmAlg.AES_GCM })
          const challenge = JSON.stringify({ iv: utils.arrBufToBase64(iv), msg })
          const userChallengeResult = await producer.handleUserChallenge(sessionKey, challenge)

          let val = null
          if (userChallengeResult.ok) { val = userChallengeResult.value }

          expect(userChallengeResult.ok).toBe(true)
          expect(val?.pin).toEqual(Array.from(pin))
          expect(val?.audience).toEqual(DID)
        })
    )
  })

  it("returns an error when initialization vector is missing", async () => {
    const pin = [0, 0, 0, 0, 0, 0]
    const iv = utils.randomBuf(16)
    const msg = await aes.encrypt(JSON.stringify({ did: DID, pin }), sessionKey, { iv, alg: SymmAlg.AES_GCM })
    const challenge = JSON.stringify({ msg }) // initialization vector missing
    const userChallengeResult = await producer.handleUserChallenge(sessionKey, challenge)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error when pin is missing", async () => {
    const iv = utils.randomBuf(16)
    const msg = await aes.encrypt(JSON.stringify({ did: DID }), sessionKey, { iv, alg: SymmAlg.AES_GCM }) // pin missing
    const challenge = JSON.stringify({ msg })
    const userChallengeResult = await producer.handleUserChallenge(sessionKey, challenge)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error when audience DID is missing", async () => {
    const pin = [0, 0, 0, 0, 0, 0]
    const iv = utils.randomBuf(16)
    const msg = await aes.encrypt(JSON.stringify({ pin }), sessionKey, { iv, alg: SymmAlg.AES_GCM }) // DID missing
    const challenge = JSON.stringify({ msg })
    const userChallengeResult = await producer.handleUserChallenge(sessionKey, challenge)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("ignores challenge messages it cannot decrypt", async () => {
    const pin = [0, 0, 0, 0, 0, 0]
    const iv = utils.randomBuf(16)
    const msg = await aes.encrypt(JSON.stringify({ did: DID, pin }), sessionKey, { iv, alg: SymmAlg.AES_GCM })
    const challenge = JSON.stringify({ iv: utils.arrBufToBase64(iv), msg })
    const userChallengeResult = await producer.handleUserChallenge(sessionKeyNoise, challenge)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })
})