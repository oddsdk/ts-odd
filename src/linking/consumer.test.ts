import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import * as DID from "../did/index.js"
import * as Consumer from "./consumer.js"
import * as Ucan from "../ucan/index.js"
import { SymmAlg } from "../components/crypto/implementation.js"
import { components, crypto } from "../../tests/helpers/components.js"


describe("generate temporary exchange key", async () => {
  it("returns a temporary RSA key pair and DID", async () => {
    const { temporaryRsaPair, temporaryDID } = await Consumer.generateTemporaryExchangeKey(crypto)

    expect(temporaryRsaPair).toBeDefined()
    expect(temporaryRsaPair).not.toBeNull()
    expect(temporaryDID).toBeDefined()
    expect(temporaryDID).not.toBeNull()
  })

  it("returns a DID that matches the temporary RSA public key", async () => {
    const { temporaryRsaPair, temporaryDID } = await Consumer.generateTemporaryExchangeKey(crypto)
    const temporaryPublicKey = await crypto.rsa.exportPublicKey(temporaryRsaPair.publicKey)
    const didPublicKey = DID.didToPublicKey(crypto, temporaryDID).publicKey

    expect(didPublicKey).toEqual(temporaryPublicKey)
  })
})

describe("handle session key", async () => {
  let temporaryRsaPair: CryptoKeyPair
  let temporaryDID: string
  let sessionKey: CryptoKey
  let exportedSessionKey: Uint8Array
  let exportedSessionKeyBase64: string
  let encryptedSessionKey: Uint8Array
  let encryptedSessionKeyBase64: string
  let iv: Uint8Array

  beforeEach(async () => {
    temporaryRsaPair = await crypto.rsa.genKey()
    sessionKey = await crypto.aes.genKey(SymmAlg.AES_GCM)
    exportedSessionKey = await crypto.aes.exportKey(sessionKey)
    iv = crypto.misc.randomNumbers({ amount: 16 })

    const exportedPubKey = await crypto.rsa.exportPublicKey(temporaryRsaPair.publicKey)
    temporaryDID = DID.publicKeyToDid(crypto, exportedPubKey, "rsa")

    if (!temporaryRsaPair.publicKey) throw new Error("Temporary RSA public key missing")
    encryptedSessionKey = await crypto.rsa.encrypt(exportedSessionKey, temporaryRsaPair.publicKey)
    exportedSessionKeyBase64 = Uint8arrays.toString(exportedSessionKey, "base64pad")
    encryptedSessionKeyBase64 = Uint8arrays.toString(encryptedSessionKey, "base64pad")
  })

  it("returns a session key after validating a closed UCAN", async () => {
    const closedUcan = await Ucan.build({
      dependencies: { crypto },

      issuer: await DID.ucan(crypto),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [ { sessionKey: Uint8arrays.toString(exportedSessionKey, "base64pad") } ],
      potency: null
    })
    const msg = await aesEncrypt(Ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg,
      sessionKey: Uint8arrays.toString(encryptedSessionKey, "base64pad")
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await Consumer.handleSessionKey(crypto, temporaryRsaPair.privateKey, message)

    let val
    if (sessionKeyResult.ok) { val = sessionKeyResult.value }

    expect(sessionKeyResult.ok).toBe(true)
    expect(val).toEqual(await crypto.aes.exportKey(sessionKey))
  })

  it("returns a warning when the message received has the wrong shape", async () => {
    const closedUcan = await Ucan.build({
      dependencies: { crypto },

      issuer: await DID.ucan(crypto),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [ { sessionKey: exportedSessionKeyBase64 } ],
      potency: null
    })
    const msg = await aesEncrypt(Ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      msg,
      sessionKey: exportedSessionKeyBase64
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await Consumer.handleSessionKey(crypto, temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns a warning when it receives a session key it cannot decrypt with its temporary private key", async () => {
    const temporaryRsaPairNoise = await crypto.rsa.genKey()
    const rawSessionKeyNoise = exportedSessionKey

    if (!temporaryRsaPairNoise.publicKey) throw new Error("Temporary RSA public key missing")
    const encryptedSessionKeyNoise = await crypto.rsa.encrypt(rawSessionKeyNoise, temporaryRsaPairNoise.publicKey)

    const closedUcan = await Ucan.build({
      dependencies: { crypto },

      issuer: await DID.ucan(crypto),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [ { sessionKey: exportedSessionKeyBase64 } ],
      potency: null
    })
    const msg = await aesEncrypt(Ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      msg,
      sessionKey: Uint8arrays.toString(encryptedSessionKeyNoise, "base64pad") // session key encrypted with noise
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await Consumer.handleSessionKey(crypto, temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns an error when closed UCAN cannot be decrypted with the provided session key", async () => {
    const mismatchedSessionKey = await crypto.aes.genKey(SymmAlg.AES_GCM)
    const closedUcan = await Ucan.build({
      dependencies: { crypto },

      issuer: await DID.ucan(crypto),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [ { sessionKey: exportedSessionKeyBase64 } ],
      potency: null
    })
    const msg = await aesEncrypt(Ucan.encode(closedUcan), mismatchedSessionKey, iv)
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg,
      sessionKey: encryptedSessionKeyBase64
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await Consumer.handleSessionKey(crypto, temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error when the closed UCAN is invalid", async () => {
    const closedUcan = await Ucan.build({
      dependencies: { crypto },

      issuer: "invalidIssuer", // Invalid issuer DID
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [ { sessionKey: exportedSessionKeyBase64 } ],
      potency: null
    })
    const msg = await aesEncrypt(Ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg,
      sessionKey: encryptedSessionKeyBase64
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await Consumer.handleSessionKey(crypto, temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error if the closed UCAN has potency", async () => {
    const closedUcan = await Ucan.build({
      dependencies: { crypto },

      issuer: await DID.ucan(crypto),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [ { sessionKey: exportedSessionKeyBase64 } ],
      potency: "SUPER_USER" // closed UCAN should have null potency
    })
    const msg = await aesEncrypt(Ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg,
      sessionKey: encryptedSessionKeyBase64
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await Consumer.handleSessionKey(crypto, temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error if session key missing in closed UCAN", async () => {
    const closedUcan = await Ucan.build({
      dependencies: { crypto },

      issuer: await DID.ucan(crypto),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [],  // session key missing in facts
      potency: null
    })
    const msg = await aesEncrypt(Ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg,
      sessionKey: encryptedSessionKeyBase64
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await Consumer.handleSessionKey(crypto, temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })

  it("returns an error if session key in closed UCAN does not match session key", async () => {
    const closedUcan = await Ucan.build({
      dependencies: { crypto },

      issuer: await DID.ucan(crypto),
      audience: temporaryDID,
      lifetimeInSeconds: 60 * 5,
      facts: [ { sessionKey: "mismatchedSessionKey" } ], // does not match session key
      potency: null
    })
    const msg = await aesEncrypt(Ucan.encode(closedUcan), sessionKey, iv)
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg,
      sessionKey: encryptedSessionKeyBase64
    })
    if (!temporaryRsaPair.privateKey) throw new Error("Temporary RSA private key missing")

    const sessionKeyResult = await Consumer.handleSessionKey(crypto, temporaryRsaPair.privateKey, message)

    let err
    if (sessionKeyResult.ok === false) { err = sessionKeyResult.error }

    expect(sessionKeyResult.ok).toBe(false)
    expect(err?.name === "LinkingError").toBe(true)
  })
})

describe("generate a user challenge", async () => {
  let sessionKey: Uint8Array

  beforeEach(async () => {
    sessionKey = await crypto.aes.exportKey(
      await crypto.aes.genKey(SymmAlg.AES_GCM)
    )
  })

  it("generates a pin and challenge message", async () => {
    const { pin, challenge } = await Consumer.generateUserChallenge(crypto, sessionKey)

    expect(pin).toBeDefined()
    expect(pin).not.toBeNull()
    expect(challenge).toBeDefined()
    expect(challenge).not.toBeNull()
  })

  it("challenge message can be decrypted", async () => {
    const { challenge } = await Consumer.generateUserChallenge(crypto, sessionKey)
    const { iv, msg } = JSON.parse(challenge)

    await expect(aesDecrypt(msg, sessionKey, iv)).resolves.toBeDefined()
  })

  it("challenge message pin matches original pin", async () => {
    const { pin, challenge } = await Consumer.generateUserChallenge(crypto, sessionKey)
    const { iv, msg } = JSON.parse(challenge)
    const json = await aesDecrypt(msg, sessionKey, iv)
    const message = JSON.parse(json)

    const originalPin = Array.from(pin)
    const messagePin = Object.values(message.pin) as number[]

    expect(messagePin).toEqual(originalPin)
  })
})

describe("link device", async () => {
  let sessionKey: Uint8Array
  let deviceLinked: boolean
  const username = "snakecase" // username is set in storage, not important for these tests

  const linkDevice = async (username: string, data: Record<string, unknown>): Promise<void> => {
    if (data.link === true) {
      deviceLinked = true
    }
  }

  const customAuthComponent = { ...components.auth, linkDevice }

  beforeEach(async () => {
    sessionKey = await crypto.aes.exportKey(
      await crypto.aes.genKey(SymmAlg.AES_GCM)
    )

    deviceLinked = false
  })

  it("links a device on approval", async () => {
    const iv = crypto.misc.randomNumbers({ amount: 16 })
    const msg = await aesEncrypt(
      JSON.stringify({ link: true }),
      sessionKey,
      iv
    )
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg,
    })

    const linkMessage = await Consumer.linkDevice(customAuthComponent, crypto, sessionKey, username, message)

    let val: { approved: boolean } | null = null
    if (linkMessage.ok) { val = linkMessage.value }

    expect(val?.approved).toEqual(true)
    expect(deviceLinked).toEqual(true)
  })

  it("does not link on rejection", async () => {
    const iv = crypto.misc.randomNumbers({ amount: 16 })
    const msg = await aesEncrypt(
      JSON.stringify({ linkStatus: "DENIED", delegation: { link: false } }),
      sessionKey,
      iv
    )
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg,
    })

    const linkMessage = await Consumer.linkDevice(customAuthComponent, crypto, sessionKey, username, message)

    let val: { approved: boolean } | null = null
    if (linkMessage.ok) { val = linkMessage.value }

    expect(val?.approved).toEqual(false)
    expect(deviceLinked).toEqual(false)
  })

  it("returns a warning when the message received has the wrong shape", async () => {
    const iv = crypto.misc.randomNumbers({ amount: 16 })
    const msg = await aesEncrypt(
      JSON.stringify({ linkStatus: "DENIED", delegation: { link: false } }),
      sessionKey,
      iv
    )
    const message = JSON.stringify({
      msg, // iv missing
    })

    const linkMessage = await Consumer.linkDevice(customAuthComponent, crypto, sessionKey, username, message)

    let err
    if (linkMessage.ok === false) { err = linkMessage.error }

    expect(linkMessage.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns a warning when it receives a temporary DID", async () => {
    const temporaryDID = await DID.ucan(crypto)

    const userChallengeResult = await Consumer.linkDevice(customAuthComponent, crypto, sessionKey, username, temporaryDID)

    let err: Error | null = null
    if (userChallengeResult.ok === false) { err = userChallengeResult.error }

    expect(userChallengeResult.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })

  it("returns a warning when it receives a message it cannot decrypt", async () => {
    const sessionKeyNoise = await crypto.aes.genKey(SymmAlg.AES_GCM)
    const iv = crypto.misc.randomNumbers({ amount: 16 })
    const msg = await aesEncrypt(
      JSON.stringify({ linkStatus: "DENIED", delegation: { link: false } }),
      sessionKeyNoise,
      iv
    )
    const message = JSON.stringify({
      iv: Uint8arrays.toString(iv, "base64pad"),
      msg
    })

    const linkMessage = await Consumer.linkDevice(customAuthComponent, crypto, sessionKey, username, message)

    let err
    if (linkMessage.ok === false) { err = linkMessage.error }

    expect(linkMessage.ok).toBe(false)
    expect(err?.name === "LinkingWarning").toBe(true)
  })
})


async function aesEncrypt(payload: string, key: CryptoKey | Uint8Array, ivStr: string | ArrayBuffer): Promise<string> {
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

async function aesDecrypt(cipher: string, key: CryptoKey | Uint8Array, ivStr: string): Promise<string> {
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