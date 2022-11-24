import * as fc from "fast-check"
import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import * as DID from "../did/index.js"
import * as producer from "./producer.js"
import * as ucan from "../ucan/index.js"
import { SymmAlg } from "../components/crypto/implementation.js"
import { components, crypto } from "../../tests/helpers/components.js"


describe("generate session key", async () => {
  let did: string

  beforeEach(async () => {
    did = await DID.ucan(crypto)
  })

  it("generates a session key and a session key message", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(crypto, did)

    expect(sessionKey).toBeDefined()
    expect(sessionKey).not.toBeNull()
    expect(sessionKeyMessage).toBeDefined()
    expect(sessionKeyMessage).not.toBeNull()
  })

  it("generates a session key message that can be decrypted with the session key", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(crypto, did)
    const { iv, msg } = JSON.parse(sessionKeyMessage)

    await expect(aesDecrypt(msg, sessionKey, iv)).resolves.toBeDefined()
  })

  it("generates a valid closed UCAN", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(crypto, did)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aesDecrypt(msg, sessionKey, iv)
    const decodedUcan = ucan.decode(encodedUcan)

    expect(await ucan.isValid(crypto, decodedUcan)).toBe(true)
  })

  it("generates a closed UCAN without any potency", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(crypto, did)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aesDecrypt(msg, sessionKey, iv)
    const decodedUcan = ucan.decode(encodedUcan)

    expect(decodedUcan.payload.ptc).toBe(null)
  })

  it("generates a closed UCAN with the session key in its facts", async () => {
    const { sessionKey, sessionKeyMessage } = await producer.generateSessionKey(crypto, did)
    const { iv, msg } = JSON.parse(sessionKeyMessage)
    const encodedUcan = await aesDecrypt(msg, sessionKey, iv)
    const decodedUcan = ucan.decode(encodedUcan)
    const sessionKeyFromFact = decodedUcan.payload.fct[ 0 ] && decodedUcan.payload.fct[ 0 ].sessionKey
    const exportedSessionKey = Uint8arrays.toString(await crypto.aes.exportKey(sessionKey), "base64pad")

    expect(sessionKeyFromFact).not.toBe(null)
    expect(exportedSessionKey === sessionKeyFromFact).toBe(true)
  })
})

describe("handle user challenge", async () => {
  let did: string
  let sessionKey: CryptoKey
  let sessionKeyNoise: CryptoKey

  beforeEach(async () => {
    did = await DID.ucan(crypto)
    sessionKey = await crypto.aes.genKey(SymmAlg.AES_GCM)
    sessionKeyNoise = await crypto.aes.genKey(SymmAlg.AES_GCM)
  })

  it("challenge message pin and audience match original pin and audience", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pin: fc.uint8Array({ min: 0, max: 9, minLength: 6, maxLength: 6 }).map(arr => Array.from(arr)),
          iv: fc.uint8Array({ minLength: 16, maxLength: 16 })
        }), async ({ pin, iv }) => {
          const msg = await aesEncrypt(JSON.stringify({ did, pin }), sessionKey, iv)
          const challenge = JSON.stringify({ iv: Uint8arrays.toString(iv, "base64pad"), msg })
          const userChallengeResult = await producer.handleUserChallenge(crypto, sessionKey, challenge)

          if (!userChallengeResult.ok) {
            expect(userChallengeResult.ok).toBe(true)
            return
          }

          expect(userChallengeResult.value.pin).toEqual(pin)
          expect(userChallengeResult.value.audience).toEqual(did)
        })
    )
  })

  it("returns a warning when it receives a temporary DID", async () => {
    const temporaryDID = await DID.ucan(crypto)

    // A producer may be be partway through linking when another temporary DID arrives. This event will
    // trigger a warning but will otherwise ignore the message.
    const userChallengeResult = await producer.handleUserChallenge(crypto, sessionKey, temporaryDID)

    let err: Error | null = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns a warning when the message received has the wrong shape", async () => {
    const pin = [ 0, 0, 0, 0, 0, 0 ]
    const iv = crypto.misc.randomNumbers({ amount: 16 })
    const msg = await aesEncrypt(JSON.stringify({ did, pin }), sessionKey, iv)
    const challenge = JSON.stringify({ msg }) // initialization vector missing
    const userChallengeResult = await producer.handleUserChallenge(crypto, sessionKey, challenge)

    let err: Error | null = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns an error when pin is missing", async () => {
    const iv = crypto.misc.randomNumbers({ amount: 16 })
    const msg = await aesEncrypt(JSON.stringify({ did }), sessionKey, iv) // pin missing
    const challenge = JSON.stringify({ iv: Uint8arrays.toString(iv, "base64pad"), msg })
    const userChallengeResult = await producer.handleUserChallenge(crypto, sessionKey, challenge)

    let err: Error | null = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error when audience DID is missing", async () => {
    const pin = [ 0, 0, 0, 0, 0, 0 ]
    const iv = crypto.misc.randomNumbers({ amount: 16 })
    const msg = await aesEncrypt(JSON.stringify({ pin }), sessionKey, iv) // DID missing
    const challenge = JSON.stringify({ iv: Uint8arrays.toString(iv, "base64pad"), msg })
    const userChallengeResult = await producer.handleUserChallenge(crypto, sessionKey, challenge)

    let err: Error | null = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("ignores challenge messages it cannot decrypt", async () => {
    const pin = [ 0, 0, 0, 0, 0, 0 ]
    const iv = crypto.misc.randomNumbers({ amount: 16 })
    const msg = await aesEncrypt(JSON.stringify({ did, pin }), sessionKey, iv)
    const challenge = JSON.stringify({ iv: Uint8arrays.toString(iv, "base64pad"), msg })
    const userChallengeResult = await producer.handleUserChallenge(crypto, sessionKeyNoise, challenge)

    let err: Error | null = null
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
    const message = Uint8arrays.toString(
      await crypto.aes.decrypt(
        Uint8arrays.fromString(msg, "base64pad"),
        sessionKey,
        SymmAlg.AES_GCM,
        Uint8arrays.fromString(iv, "base64")
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

  const customAuthComponent = { ...components.auth, delegateAccount }

  beforeEach(async () => {
    sessionKey = await crypto.aes.genKey(SymmAlg.AES_GCM)
    accountDelegated = null
    approvedMessage = null
  })

  it("delegates an account", async () => {
    await producer.delegateAccount(customAuthComponent, crypto, sessionKey, username, audience, finishDelegation)

    expect(accountDelegated).toBe(true)
  })

  it("calls finish delegation with an approved message", async () => {
    await producer.delegateAccount(customAuthComponent, crypto, sessionKey, username, audience, finishDelegation)

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
    sessionKey = await crypto.aes.genKey(SymmAlg.AES_GCM)
    accountDelegated = null
    approvedMessage = null
  })

  it("declines to delegate an account", async () => {
    await producer.declineDelegation(crypto, sessionKey, finishDelegation)

    expect(accountDelegated).toBe(false)
  })

  it("calls finish delegation with a declined message", async () => {
    await producer.declineDelegation(crypto, sessionKey, finishDelegation)

    expect(approvedMessage).toBe(false)
  })
})


async function aesEncrypt(payload: string, key: CryptoKey, ivStr: string | ArrayBuffer): Promise<string> {
  const iv = typeof ivStr === "string" ? Uint8arrays.fromString(ivStr, "base64") : ivStr

  return Uint8arrays.toString(
    await crypto.aes.encrypt(
      Uint8arrays.fromString(payload, "utf8"),
      key,
      SymmAlg.AES_GCM,
      new Uint8Array(iv)
    ),
    "base64pad"
  )
}

async function aesDecrypt(cipher: string, key: CryptoKey, ivStr: string): Promise<string> {
  return Uint8arrays.toString(
    await crypto.aes.decrypt(
      Uint8arrays.fromString(cipher, "base64pad"),
      key,
      SymmAlg.AES_GCM,
      Uint8arrays.fromString(ivStr, "base64")
    ),
    "utf8"
  )
}