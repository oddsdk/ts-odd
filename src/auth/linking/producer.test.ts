import expect from "expect"
import * as fc from "fast-check"
import { webcrypto } from "one-webcrypto"
import * as uint8arrays from "uint8arrays"
import aes from "keystore-idb/lib/aes/index.js"
import { SymmAlg } from "keystore-idb/lib/types.js"
import utils from "keystore-idb/lib/utils.js"

import * as did from "../../../src/did/index.js"
import * as producer from "./producer.js"
import * as ucan from "../../ucan/index.js"
import { LOCAL_IMPLEMENTATION } from "../local.js"
import { setImplementations } from "../../setup.js"

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

    await expect(aesDecrypt(msg, sessionKey, iv)).resolves.toBeDefined()
  })

  it("generates a valid closed UCAN", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(DID)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aesDecrypt(msg, sessionKey, iv)
    const decodedUcan = ucan.decode(encodedUcan)

    expect(await ucan.isValid(decodedUcan)).toBe(true)
  })

  it("generates a closed UCAN without any potency", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(DID)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aesDecrypt(msg, sessionKey, iv)
    const decodedUcan = ucan.decode(encodedUcan)

    expect(decodedUcan.payload.ptc).toBe(null)
  })

  it("generates a closed UCAN with the session key in its facts", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(DID)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aesDecrypt(msg, sessionKey, iv)
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
          pin: fc.uint8Array({ min: 0, max: 9, minLength: 6, maxLength: 6 }).map(arr => Array.from(arr)),
          iv: fc.uint8Array({ minLength: 16, maxLength: 16 }).map(arr => arr.buffer)
        }), async ({ pin, iv }) => {
          const msg = await aesEncrypt(JSON.stringify({ did: DID, pin }), sessionKey, iv)
          const challenge = JSON.stringify({ iv: utils.arrBufToBase64(iv), msg })
          const userChallengeResult = await producer.handleUserChallenge(sessionKey, challenge)

          if (!userChallengeResult.ok) {
            expect(userChallengeResult.ok).toBe(true)
            return
          }

          expect(userChallengeResult.value.pin).toEqual(pin)
          expect(userChallengeResult.value.audience).toEqual(DID)
        })
    )
  })

  it("returns a warning when it receives a temporary DID", async () => {
    const temporaryDID = await did.ucan()

    // A producer may be be partway through linking when another temporary DID arrives. This event will
    // trigger a warning but will otherwise ignore the message.
    const userChallengeResult = await producer.handleUserChallenge(sessionKey, temporaryDID)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns a warning when the message received has the wrong shape", async () => {
    const pin = [0, 0, 0, 0, 0, 0]
    const iv = utils.randomBuf(16)
    const msg = await aesEncrypt(JSON.stringify({ did: DID, pin }), sessionKey, iv)
    const challenge = JSON.stringify({ msg }) // initialization vector missing
    const userChallengeResult = await producer.handleUserChallenge(sessionKey, challenge)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns an error when pin is missing", async () => {
    const iv = utils.randomBuf(16)
    const msg = await aesEncrypt(JSON.stringify({ did: DID }), sessionKey, iv) // pin missing
    const challenge = JSON.stringify({ iv: utils.arrBufToBase64(iv), msg })
    const userChallengeResult = await producer.handleUserChallenge(sessionKey, challenge)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error when audience DID is missing", async () => {
    const pin = [0, 0, 0, 0, 0, 0]
    const iv = utils.randomBuf(16)
    const msg = await aesEncrypt(JSON.stringify({ pin }), sessionKey, iv) // DID missing
    const challenge = JSON.stringify({ iv: utils.arrBufToBase64(iv), msg })
    const userChallengeResult = await producer.handleUserChallenge(sessionKey, challenge)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("ignores challenge messages it cannot decrypt", async () => {
    const pin = [0, 0, 0, 0, 0, 0]
    const iv = utils.randomBuf(16)
    const msg = await aesEncrypt(JSON.stringify({ did: DID, pin }), sessionKey, iv)
    const challenge = JSON.stringify({ iv: utils.arrBufToBase64(iv), msg })
    const userChallengeResult = await producer.handleUserChallenge(sessionKeyNoise, challenge)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })
})


describe("delegate account", async () => {
  let sessionKey: CryptoKey
  let accountDelegated: boolean | null
  let approvedMessage: boolean | null
  const username = "snakecase"
  const audience = "audie"

  const delegateAccount = async (username: string, audience: string): Promise<Record<string, unknown>> => {
    return { username, audience }
  }

  const finishDelegation = async (delegationMessage: string, approved: boolean): Promise<void> => {
    const { iv, msg } = JSON.parse(delegationMessage)
    const message = uint8arrays.toString(
      await webcrypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: uint8arrays.fromString(iv, "base64"),
        },
        sessionKey,
        utils.base64ToArrBuf(msg),
      ),
      "utf8"
    )
    const delegation = JSON.parse(message)

    approvedMessage = approved

    if (approved &&
      delegation.username === username &&
      delegation.audience === audience) {
      accountDelegated = true
    }
  }

  before(async () => {
    setImplementations({
      auth: {
        ...LOCAL_IMPLEMENTATION.auth,
        delegateAccount
      }
    })
  })

  beforeEach(async () => {
    sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
    accountDelegated = null
    approvedMessage = null 
  })

  it("delegates an account", async () => {
    await producer.delegateAccount(sessionKey, username, audience, finishDelegation)

    expect(accountDelegated).toBe(true)
  })

  it("calls finish delegation with an approved message", async () => {
    await producer.delegateAccount(sessionKey, username, audience, finishDelegation)

    expect(approvedMessage).toBe(true)
  })
})


describe("decline delegation", async () => {
  let sessionKey: CryptoKey
  let accountDelegated: boolean | null
  let approvedMessage: boolean | null

  const finishDelegation = async (delegationMessage: string, approved: boolean): Promise<void> => {
    const { iv, msg } = JSON.parse(delegationMessage)
    const message = await aesDecrypt(msg, sessionKey, iv)
    const link = JSON.parse(message)

    approvedMessage = approved

    if (link.linkStatus === "DENIED") {
      accountDelegated = false 
    }
  }

  beforeEach(async () => {
    sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
    accountDelegated = null 
    approvedMessage = null
  })

  it("declines to delegate an account", async () => {
    await producer.declineDelegation(sessionKey, finishDelegation)

    expect(accountDelegated).toBe(false)
  })

  it("calls finish delegation with a declined message", async () => {
    await producer.declineDelegation(sessionKey, finishDelegation)

    expect(approvedMessage).toBe(false)
  })
})


async function aesEncrypt(payload: string, key: CryptoKey, ivStr: string | ArrayBuffer): Promise<string> {
  const iv = typeof ivStr === "string" ? uint8arrays.fromString(ivStr, "base64") : ivStr
  return utils.arrBufToBase64(
    await webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      uint8arrays.fromString(payload, "utf8")
    )
  )
}

async function aesDecrypt(cipher: string, key: CryptoKey, ivStr: string): Promise<string> {
  return uint8arrays.toString(
    await webcrypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: uint8arrays.fromString(ivStr, "base64"),
      },
      key,
      utils.base64ToArrBuf(cipher),
    ),
    "utf8"
  )
}