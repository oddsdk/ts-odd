import expect from "expect"
import * as uint8arrays from "uint8arrays"
import { webcrypto } from "one-webcrypto"
import aes from "keystore-idb/aes/index.js"
import config from "keystore-idb/config.js"
import rsa from "keystore-idb/rsa/index.js"
import { CharSize, KeyUse, SymmAlg } from "keystore-idb/types.js"
import utils from "keystore-idb/utils.js"

import * as did from "../../../src/did/index.js"
import * as consumer from "./consumer.js"
import * as ucan from "../../ucan/index.js"
import { BASE_IMPLEMENTATION } from "../implementation/base.js"
import { setImplementations } from "../../setup.js"

describe("generate temporary exchange key", async () => {
  it("returns a temporary RSA key pair and DID", async () => {
    const { temporaryRsaPair, temporaryDID } = await consumer.generateTemporaryExchangeKey()

    expect(temporaryRsaPair).toBeDefined()
    expect(temporaryRsaPair).not.toBeNull()
    expect(temporaryDID).toBeDefined()
    expect(temporaryDID).not.toBeNull()
  })

  it("returns a DID that matches the temporary RSA public key", async () => {
    const { temporaryRsaPair, temporaryDID } = await consumer.generateTemporaryExchangeKey()
    const temporaryPublicKey = await rsa.getPublicKey(temporaryRsaPair)
    const didPublicKey = did.didToPublicKey(temporaryDID).publicKey

    expect(didPublicKey).toEqual(temporaryPublicKey)
  })
})

describe("handle session key", async () => {
  let temporaryRsaPair: CryptoKeyPair
  let temporaryDID: string
  let sessionKey: CryptoKey
  let exportedSessionKey: string
  let encryptedSessionKey: ArrayBuffer
  let iv: ArrayBuffer

  beforeEach(async () => {
    const cfg = config.normalize()
    const { rsaSize, hashAlg } = cfg
    temporaryRsaPair = await rsa.makeKeypair(rsaSize, hashAlg, KeyUse.Exchange)
    sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
    exportedSessionKey = await aes.exportKey(sessionKey)
    iv = utils.randomBuf(16)

    const exportedPubKey = await rsa.getPublicKey(temporaryRsaPair)
    temporaryDID = did.publicKeyToDid(exportedPubKey, did.KeyType.RSA)

    const rawSessionKey = utils.arrBufToStr(utils.base64ToArrBuf(exportedSessionKey), CharSize.B16)
    if (!temporaryRsaPair.publicKey) throw new Error("Temporary RSA public key missing")
    encryptedSessionKey = await rsa.encrypt(rawSessionKey, temporaryRsaPair.publicKey)
  })

  it("returns a session key after validating a closed UCAN", async () => {
    const closedUcan = await ucan.build({
      issuer: await did.ucan(),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [{ sessionKey: exportedSessionKey }],
      potency: null
    })
    const msg = await aesEncrypt(ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKey)
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await consumer.handleSessionKey(temporaryRsaPair.privateKey, message)

    let val
    if (sessionKeyResult.ok) { val = sessionKeyResult.value }

    expect(sessionKeyResult.ok).toBe(true)
    expect(val).toEqual(sessionKey)
  })

  it("returns a warning when the message received has the wrong shape", async () => {
    const closedUcan = await ucan.build({
      issuer: await did.ucan(),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [{ sessionKey: exportedSessionKey }],
      potency: null
    })
    const msg = await aesEncrypt(ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKey)
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await consumer.handleSessionKey(temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns a warning when it receives a session key it cannot decrypt with its temporary private key", async () => {
    const cfg = config.normalize()
    const { rsaSize, hashAlg } = cfg
    const temporaryRsaPairNoise = await rsa.makeKeypair(rsaSize, hashAlg, KeyUse.Exchange)
    const rawSessionKeyNoise = utils.arrBufToStr(utils.base64ToArrBuf(exportedSessionKey), CharSize.B16)

    if (!temporaryRsaPairNoise.publicKey) throw new Error("Temporary RSA public key missing")
    const encryptedSessionKeyNoise = await rsa.encrypt(rawSessionKeyNoise, temporaryRsaPairNoise.publicKey)

    const closedUcan = await ucan.build({
      issuer: await did.ucan(),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [{ sessionKey: exportedSessionKey }],
      potency: null
    })
    const msg = await aesEncrypt(ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKeyNoise) // session key encrypted with noise
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await consumer.handleSessionKey(temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns an error when closed UCAN cannot be decrypted with the provided session key", async () => {
    const mismatchedSessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
    const closedUcan = await ucan.build({
      issuer: await did.ucan(),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [{ sessionKey: exportedSessionKey }],
      potency: null
    })
    const msg = await aesEncrypt(ucan.encode(closedUcan), mismatchedSessionKey, iv)
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKey)
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await consumer.handleSessionKey(temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error when the closed UCAN is invalid", async () => {
    const closedUcan = await ucan.build({
      issuer: "invalidIssuer", // Invalid issuer DID
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [{ sessionKey: exportedSessionKey }],
      potency: null
    })
    const msg = await aesEncrypt(ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKey)
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await consumer.handleSessionKey(temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error if the closed UCAN has potency", async () => {
    const closedUcan = await ucan.build({
      issuer: await did.ucan(),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [{ sessionKey: exportedSessionKey }],
      potency: "SUPER_USER" // closed UCAN should have null potency
    })
    const msg = await aesEncrypt(ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKey)
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await consumer.handleSessionKey(temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error if session key missing in closed UCAN", async () => {
    const closedUcan = await ucan.build({
      issuer: await did.ucan(),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [],  // session key missing in facts
      potency: null
    })
    const msg = await aesEncrypt(ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKey)
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await consumer.handleSessionKey(temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error if session key in closed UCAN does not match session key", async () => {
    const closedUcan = await ucan.build({
      issuer: await did.ucan(),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [{ sessionKey: "mismatchedSessionKey" }], // does not match session key
      potency: null
    })
    const msg = await aesEncrypt(ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKey)
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await consumer.handleSessionKey(temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })
})

describe("generate a user challenge", async () => {
  let sessionKey: CryptoKey

  beforeEach(async () => {
    sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
  })

  it("generates a pin and challenge message", async () => {
    const { pin, challenge } = await consumer.generateUserChallenge(sessionKey)

    expect(pin).toBeDefined()
    expect(pin).not.toBeNull()
    expect(challenge).toBeDefined()
    expect(challenge).not.toBeNull()
  })

  it("challenge message can be decrypted", async () => {
    const { challenge } = await consumer.generateUserChallenge(sessionKey)
    const { iv, msg } = JSON.parse(challenge)

    await expect(aesDecrypt(msg, sessionKey, iv)).resolves.toBeDefined()
  })

  it("challenge message pin matches original pin", async () => {
    const { pin, challenge } = await consumer.generateUserChallenge(sessionKey)
    const { iv, msg } = JSON.parse(challenge)
    const json = await aesDecrypt(msg, sessionKey, iv)
    const message = JSON.parse(json)

    const originalPin = Array.from(pin)
    const messagePin = Object.values(message.pin) as number[]

    expect(messagePin).toEqual(originalPin)
  })
})

describe("link device", async () => {
  let sessionKey: CryptoKey
  let deviceLinked: boolean
  const username = "snakecase" // username is set in storage, not important for these tests

  const linkDevice = async (data: Record<string, unknown>): Promise<void> => {
    if (data.link === true) {
      deviceLinked = true
    }
  }

  before(async () => {
    setImplementations({
      auth: {
        ...BASE_IMPLEMENTATION.auth,
        linkDevice
      }
    })
  })

  beforeEach(async () => {
    sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
    deviceLinked = false
  })

  it("links a device on approval", async () => {
    const iv = utils.randomBuf(16)
    const msg = await aesEncrypt(
      JSON.stringify({ link: true }),
      sessionKey,
      iv
    )
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
    })

    const linkMessage = await consumer.linkDevice(sessionKey, username, message)

    let val = null
    if (linkMessage.ok) { val = linkMessage.value }

    expect(val?.approved).toEqual(true)
    expect(deviceLinked).toEqual(true)
  })

  it("does not link on rejection", async () => {
    const iv = utils.randomBuf(16)
    const msg = await aesEncrypt(
      JSON.stringify({ linkStatus: "DENIED", delegation: { link: false } }),
      sessionKey,
      iv
    )
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
    })

    const linkMessage = await consumer.linkDevice(sessionKey, username, message)

    let val = null
    if (linkMessage.ok) { val = linkMessage.value }

    expect(val?.approved).toEqual(false)
    expect(deviceLinked).toEqual(false)
  })

  it("returns a warning when the message received has the wrong shape", async () => {
    const iv = utils.randomBuf(16)
    const msg = await aesEncrypt(
      JSON.stringify({ linkStatus: "DENIED", delegation: { link: false } }),
      sessionKey,
      iv
    )
    const message = JSON.stringify({
      msg, // iv missing
    })

    const linkMessage = await consumer.linkDevice(sessionKey, username, message)

    let err
    if (linkMessage.ok === false) { err = linkMessage.error }

    expect(linkMessage.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns a warning when it receives a temporary DID", async () => {
    const temporaryDID = await did.ucan()

    const userChallengeResult = await consumer.linkDevice(sessionKey, username, temporaryDID)

    let err = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns a warning when it receives a message it cannot decrypt", async () => {
    const sessionKeyNoise = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })
    const iv = utils.randomBuf(16)
    const msg = await aesEncrypt(
      JSON.stringify({ linkStatus: "DENIED", delegation: { link: false } }),
      sessionKeyNoise,
      iv
    )
    const message = JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg
    })

    const linkMessage = await consumer.linkDevice(sessionKey, username, message)

    let err
    if (linkMessage.ok === false) { err = linkMessage.error }

    expect(linkMessage.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
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