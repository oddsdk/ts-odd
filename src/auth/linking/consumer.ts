import aes from "keystore-idb/lib/aes/index.js"
import config from "keystore-idb/lib/config.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg } from "keystore-idb/lib/types.js"
import * as did from "../../did/index.js"
import * as ucan from "../../ucan/index.js"
import * as storage from "../../storage/index.js"
import { EventEmitter } from "../../common/event-emitter"
import { setLinkingRole } from "../linking/switch.js"
import { publishOnChannel } from "../index.js"
import * as auth from "../index.js"

import type { Maybe } from "../../common/index.js"
import type { EventListener } from "../../common/event-emitter"

type AccountLinkingConsumer = {
  on: OnChallenge & OnLink & OnError & OnDone
  cancel: () => void
}

type OnChallenge = (event: "challenge", listener: (args: { pin: number[] }) => void) => void
type OnLink = (event: "link", listener: (args: { approved: boolean; username: string }) => void) => void
type OnError = (event: "error", listener: (args: { err: Error }) => void) => void
type OnDone = (event: "done", listener: () => void) => void

type LinkingStep = "BROADCAST" | "NEGOTIATION" | "DELEGATION"

type LinkingState = {
  username: Maybe<string>
  sessionKey: Maybe<CryptoKey>
  temporaryRsaPair: Maybe<CryptoKeyPair>
  step: Maybe<LinkingStep>
}

const ls: LinkingState = {
  username: null,
  sessionKey: null,
  temporaryRsaPair: null,
  step: null
}

let eventEmitter: Maybe<EventEmitter> = null


export const createConsumer = async (config: { username: string; timeout?: number }): Promise<AccountLinkingConsumer> => {
  if (eventEmitter === null) {
    eventEmitter = new EventEmitter()
    setLinkingRole("CONSUMER")
    ls.step = "BROADCAST"
    ls.username = config.username
    await auth.openChannel(ls.username)
    await sendTemporaryExchangeKey()
  }

  return {
    on: (event: string, listener: EventListener) => { eventEmitter?.addEventListener(event, listener) },
    cancel
  }
}

const cancel = async () => {
  eventEmitter = null
  resetLinkingState()
  await auth.closeChannel()
}

const resetLinkingState = () => {
  ls.username = null
  ls.sessionKey = null
  ls.temporaryRsaPair = null
  ls.step = null
}


export const handleMessage = async (message: string): Promise<void> => {
  if (ls.step === "NEGOTIATION") {
    const pin = await handleSessionKey(message)
    if (pin) {
      await sendUserChallenge(pin)
      eventEmitter?.dispatchEvent("challenge", { pin: Array.from(pin) })
    }
  } else if (ls.step === "DELEGATION") {
    await linkDevice(message)
  }
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


// 🔗 Device Linking Steps 

/**
 *  BROADCAST
 * 
 * This is the CONSUMER first step (after opening the channel) where we 
 * broadcast a temporary public key. This key is then published on channel as 
 * the throwaway DID key.
 */
const sendTemporaryExchangeKey = async (): Promise<void> => {
  const cfg = config.normalize()

  const { rsaSize, hashAlg } = cfg
  ls.temporaryRsaPair = await rsa.makeKeypair(rsaSize, hashAlg, KeyUse.Exchange)
  const pubKey = await rsa.getPublicKey(ls.temporaryRsaPair)
  const temporaryDID = did.publicKeyToDid(pubKey, did.KeyType.RSA)
  await publishOnChannel(temporaryDID)
  nextStep()
}

/**
 *  NEGOTIATION
 * 
 * The Consumer receives the session key and validates the encrypted UCAN. 
 * Upon success, returns a 6-digit pin code to be use for the user challenge.
 * 
 * @param data 
 * @returns pin
 */
const handleSessionKey = async (data: string): Promise<Maybe<Uint8Array>> => {
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
 * NEGOTIATION (response)
 * 
 * Encrypt and publish the CONSUMER did and generated pin for verification by the PRODUCER.
 * 
 * @param pin 
 * @returns 
 */
const sendUserChallenge = async (pin: Uint8Array): Promise<void> => {
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
 * CONSUMER: DELEGATION
 *
 * Decrypt the delegated credentials and forward to client implementation
 *
 * @param pin
 * @returns
 */
const linkDevice = async (data: string): Promise<void> => {
  if (!ls.sessionKey) return

  const { iv, msg } = JSON.parse(data)

  const message = await aes.decrypt(
    msg,
    ls.sessionKey,
    {
      alg: SymmAlg.AES_GCM,
      iv: iv
    }
  )
  const response = JSON.parse(message)

  if (response.linkStatus === "APPROVED") {
    await storage.setItem("webnative.auth_username", ls.username)
    await auth.linkDevice(response.delegation)
    eventEmitter?.dispatchEvent("link", { approved: true, username: ls.username })
  } else if (response.linkStatus === "DENIED") {
    eventEmitter?.dispatchEvent("link", { approved: false, username: ls.username })
  }

  resetLinkingState()
  await auth.closeChannel()

  return
}