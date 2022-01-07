import aes from "keystore-idb/lib/aes/index.js"
import config from "keystore-idb/lib/config.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg, HashAlg, CharSize } from "keystore-idb/lib/types.js"
import * as did from "../did/index.js"
import * as ucan from "../ucan/index.js"
import { publishOnChannel } from "./index.js"
import * as auth from "./index.js"

type LinkingRole = "CONSUMER" | "PRODUCER"

type LinkingStep = "BROADCAST" | "NEGOTIATION" | "DELEGATION"

type LinkingState = {
  sessionKey: CryptoKey | null
  temporaryRsaPair: CryptoKeyPair | null
  role: LinkingRole | null
  step: LinkingStep | null
}

const ls: LinkingState = {
  sessionKey: null,
  temporaryRsaPair: null,
  role: null,
  step: null
}

const resetLinkingState = () => {
  ls.sessionKey = null
  ls.temporaryRsaPair = null
  ls.role = null
  ls.step = null
}

const nextStep = () => {
  switch (ls.step) {
    case "BROADCAST":
      ls.step = "NEGOTIATION"
      break
    case "NEGOTIATION":
      ls.step = "DELEGATION"
      break
    default:
      ls.step = "BROADCAST"
  }
}

export const startLinkingConsumer = async (username: string): Promise<null> => {
  ls.role = "CONSUMER"
  ls.step = "BROADCAST"
  await auth.openChannel(username)
  await sendTemporaryExchangeKey()
  return null
}

export const startLinkingProducer = async (username: string): Promise<null> => {
  ls.role = "PRODUCER"
  ls.step = "BROADCAST"
  await auth.openChannel(username)
  return null
}

export const handleMessage = async (event: MessageEvent): Promise<any> => {
  const { data } = event
  const message = new TextDecoder().decode(data.arrayBuffer ? await data.arrayBuffer() : data)
  console.debug("Linking Status", ls)
  console.debug("message (raw)", message)
  switch (ls.role) {
    case "CONSUMER":
      await handleConsumerMessage(message)
      break
    case "PRODUCER":
      await handleProducerMessage(message)
      break
  }
}

const handleProducerMessage = async (message: string): Promise<void> => {
  if (ls.step === "BROADCAST") {
    await sendSessionKey(message)
  } else if (ls.step === "NEGOTIATION") {
    const response = await handleUserChallenge(message)
    if (response) {
      const json = JSON.parse(response)
      console.log("PIN to SHOW", Object.values(json.pin))
    }
  }
}

const handleConsumerMessage = async (message: string): Promise<void> => {
  if (ls.step === "NEGOTIATION") {
    const pin = await handleSessionKey(message)
    if (pin) {
      console.log("PIN to SHOW", Array.from(pin))
      await sendUserChallenge(pin)
    }
  }
}

// 🔗 Device Linking Steps 

/**
 * CONSUMER: BROADCAST
 * 
 * This is the CONSUMER first step (after opening the channel) where we 
 * broadcast a temporary public key. This key is then published on channel as 
 * the throwaway DID key.
 */
export const sendTemporaryExchangeKey = async (): Promise<void> => {
  const cfg = config.normalize()

  const { rsaSize, hashAlg } = cfg
  ls.temporaryRsaPair = await rsa.makeKeypair(rsaSize, hashAlg, KeyUse.Exchange)
  const pubKey = await rsa.getPublicKey(ls.temporaryRsaPair)
  const temporaryDID = did.publicKeyToDid(pubKey, did.KeyType.RSA)
  await publishOnChannel(temporaryDID)
  nextStep()
}

/**
 * state: PRODUCER: BROADCAST
 * 
 * This should be called by the PRODUCER upon receiving the throwaway DID key.
 * 
 * @param didThrowaway 
 */
export const sendSessionKey = async (didThrowaway: string): Promise<void> => {
  ls.sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })

  const sessionKey = await aes.exportKey(ls.sessionKey)

  const { publicKey } = did.didToPublicKey(didThrowaway)
  const publicCryptoKey = await rsa.importPublicKey(publicKey, HashAlg.SHA_256, KeyUse.Exchange)

  // Note: rsa.encrypt expects a B16 string
  const rawSessionKey = utils.arrBufToStr(utils.base64ToArrBuf(sessionKey), CharSize.B16)
  const encryptedSessionKey = await rsa.encrypt(rawSessionKey, publicCryptoKey)

  const u = await ucan.build({
    issuer: await did.ucan(),
    audience: didThrowaway,
    lifetimeInSeconds: 60 * 5, // 5 minutes
    facts: [{ sessionKey }],
    potency: null
  })

  const iv = utils.randomBuf(16)
  const msg = await aes.encrypt(ucan.encode(u), ls.sessionKey, { iv, alg: SymmAlg.AES_GCM })

  await publishOnChannel(
    JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
      sessionKey: utils.arrBufToBase64(encryptedSessionKey)
    })
  )
  nextStep()
}

/**
 * CONSUMER: NEGOTIATION
 * 
 * The Consumer receives the session key and validates the encrypted UCAN. 
 * Upon success, returns a 6-digit pin code to be use for the user challenge.
 * 
 * @param data 
 * @returns pin
 */
export const handleSessionKey = async (data: any): Promise<Uint8Array | null> => {
  if (!ls.temporaryRsaPair || !ls.temporaryRsaPair.privateKey) return null

  if (ls.sessionKey) {
    throw new Error("Already got a session key")
  }

  const json = JSON.parse(data)
  const iv = utils.base64ToArrBuf(json.iv)

  const encryptedSessionKey = utils.base64ToArrBuf(json.sessionKey)
  const rawSessionKey = await rsa.decrypt(encryptedSessionKey, ls.temporaryRsaPair.privateKey)
  const sessionKey = await aes.importKey(utils.arrBufToBase64(rawSessionKey), { alg: SymmAlg.AES_GCM, length: 256 })

  ls.sessionKey = sessionKey
  ls.temporaryRsaPair = null

  // Extract UCAN
  const encodedUcan = await aes.decrypt(
    json.msg,
    ls.sessionKey,
    {
      alg: SymmAlg.AES_GCM,
      iv: iv
    }
  )

  const decodedUcan = ucan.decode(encodedUcan)

  if (await ucan.isValid(decodedUcan) === false) {
    throw new Error("Invalid closed UCAN")
  }

  if (decodedUcan.payload.ptc) {
    throw new Error("Invalid closed UCAN: must not have any potency")
  }

  const sessionKeyFromFact = decodedUcan.payload.fct[0] && decodedUcan.payload.fct[0].sessionKey
  if (!sessionKeyFromFact) {
    throw new Error("Session key is missing from closed UCAN")
  }

  const sessionKeyWeAlreadyGot = utils.arrBufToBase64(rawSessionKey)
  if (sessionKeyFromFact !== sessionKeyWeAlreadyGot) {
    throw new Error("Closed UCAN session key does not match the one we already have")
  }

  return new Uint8Array(utils.randomBuf(6)).map(n => {
    return n % 10
  })
}

/**
 * CONSUMER: NEGOTIATION (response)
 * 
 * Encrypt and publish the CONSUMER did and generated pin for verification by the PRODUCER.
 * 
 * @param pin 
 * @returns 
 */
export const sendUserChallenge = async (pin: Uint8Array): Promise<void> => {
  if (!ls.sessionKey) return
  
  const iv = utils.randomBuf(16)
  const msg = await aes.encrypt(JSON.stringify({
    did: await did.ucan(),
    pin
  }), ls.sessionKey, { iv, alg: SymmAlg.AES_GCM })

  await publishOnChannel(
    JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg
    })
  )
  nextStep()
}

/**
 * PRODUCER: NEGOTIATION
 * 
 * PRODUCER receives the DID & challenge PIN from the CONSUMER.
 * 
 * @param data 
 * @returns 
 */
export const handleUserChallenge = async (data: any): Promise<string | null> => {
  if (!ls.sessionKey) return null

  const { iv, msg } = JSON.parse(data)

  console.debug("msg: " + msg)
  if (!iv) {
    throw new Error("I tried to decrypt some data (with AES) but the `iv` was missing from the message")
  }

  console.debug("decrypting msg")
  return await aes.decrypt(msg, ls.sessionKey, {
    alg: SymmAlg.AES_GCM,
    iv
  })
  nextStep()
}

/**
 * PRODUCER: DELEGATION
 * 
 * This step is user initiated, create the UCAN with delegate rights for the CONSUMER (and a WNFS read key).
 * 
 * @param data 
 * @returns 
 */
export const sendReadKeyAndUcan = async (data: any): Promise<null> => {
  return null
}

/**
 * CONSUMER: DELEGATION
 * 
 * Receive the encrypted UCAN & readKey and store them.
 * 
 * @param readKey 
 * @param ucan 
 * @param username 
 * @returns 
 */
export const handleLinkedDevice = async (readKey: string, ucan: string, username: string): Promise<null> => {
  //
  return null
}
