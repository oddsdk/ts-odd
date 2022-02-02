import aes from "keystore-idb/lib/aes/index.js"
import config from "keystore-idb/lib/config.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg } from "keystore-idb/lib/types.js"
import * as did from "../../did/index.js"
import * as ucan from "../../ucan/index.js"
import * as storage from "../../storage/index.js"
import { EventEmitter } from "../../common/event-emitter"
import * as auth from "../index.js"
import { USERNAME_STORAGE_KEY } from "../../common/index.js"

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

export const createConsumer = async (config: { username: string; timeout?: number }): Promise<AccountLinkingConsumer> => {
  let eventEmitter: Maybe<EventEmitter> = new EventEmitter()
  const ls: LinkingState = {
    username: config.username,
    sessionKey: null,
    temporaryRsaPair: null,
    step: "BROADCAST"
  }

  const handleMessage = async (event: MessageEvent): Promise<void> => {
    const { data } = event
    const message = new TextDecoder().decode(data.arrayBuffer ? await data.arrayBuffer() : data)
    console.debug("message (raw)", message)

    if (ls.step === "NEGOTIATION") {
      ls.sessionKey = await handleSessionKey(ls, message)
      // nullify temporaryRsaKey? It has served its purpose

      if (ls.sessionKey) {
        const { pin, challenge } = await generateUserChallenge(ls.sessionKey)
        channel.send(challenge)
        eventEmitter?.dispatchEvent("challenge", { pin: Array.from(pin) })
        ls.step = "DELEGATION"
      }
    } else if (ls.step === "DELEGATION") {
      const approved = await linkDevice(ls, message)

      if (approved !== null) {
        eventEmitter?.dispatchEvent("link", { approved, username: ls.username })
      } else {
        console.log("Could not link device")
      }

      await done()
    }
  }

  const channel = await auth.createChannel(config.username, handleMessage)
  const { temporaryRsaPair, temporaryDID }  = await generateTemporaryExchangeKey()
  ls.temporaryRsaPair = temporaryRsaPair
  ls.step = "NEGOTIATION"

  await channel.send(temporaryDID)

  const done = async () => {
    eventEmitter?.dispatchEvent("done")
    eventEmitter = null
    channel.close()
    // reset linking state?
  }

  return {
    on: (event: string, listener: EventListener) => { eventEmitter?.addEventListener(event, listener) },
    cancel: done
  }
}


// 🔗 Device Linking Steps 

/**
 *  BROADCAST
 * 
 * The first CONSUMER step (after opening the channel) generates a temporary RSA keypair.
 * A temporary public key is converted to a DID for broadcast on the channel.
 * 
 * @returns temporary RSA key pair and temporary DID
 */
const generateTemporaryExchangeKey = async (): Promise<{temporaryRsaPair: CryptoKeyPair; temporaryDID: string}> => {
  const cfg = config.normalize()

  const { rsaSize, hashAlg } = cfg
  const temporaryRsaPair = await rsa.makeKeypair(rsaSize, hashAlg, KeyUse.Exchange)
  const pubKey = await rsa.getPublicKey(temporaryRsaPair)
  const temporaryDID = did.publicKeyToDid(pubKey, did.KeyType.RSA)
  return { temporaryRsaPair, temporaryDID }
}

/**
 *  NEGOTIATION
 * 
 * The Consumer receives the session key and validates the encrypted UCAN. 
 * Upon success, returns the session key.
 * 
 * @param ls
 * @param data 
 * @returns the session key or null on failure
 */
const handleSessionKey = async (ls: LinkingState, data: string): Promise<Maybe<CryptoKey>> => {
  if (!ls.temporaryRsaPair || !ls.temporaryRsaPair.privateKey) return null

  if (ls.sessionKey) {
    throw new Error("Already got a session key")
  }

  const json = JSON.parse(data)
  const iv = utils.base64ToArrBuf(json.iv)

  const encryptedSessionKey = utils.base64ToArrBuf(json.sessionKey)
  const rawSessionKey = await rsa.decrypt(encryptedSessionKey, ls.temporaryRsaPair.privateKey)
  const sessionKey = await aes.importKey(utils.arrBufToBase64(rawSessionKey), { alg: SymmAlg.AES_GCM, length: 256 })

  // Extract UCAN
  const encodedUcan = await aes.decrypt(
    json.msg,
    sessionKey,
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

  return sessionKey
}

/**
 * NEGOTIATION (response)
 * 
 * Encrypt and publish the CONSUMER did and generated pin for verification by the PRODUCER.
 * 
 * @param pin 
 * @returns 
 */
const generateUserChallenge = async (sessionKey: CryptoKey): Promise<{ pin: Uint8Array; challenge: string }> => {
  const pin = new Uint8Array(utils.randomBuf(6)).map(n => {
    return n % 10
  })

  const iv = utils.randomBuf(16)
  const msg = await aes.encrypt(JSON.stringify({
    did: await did.ucan(),
    pin
  }), sessionKey, { iv, alg: SymmAlg.AES_GCM })

  const challenge = JSON.stringify({
    iv: utils.arrBufToBase64(iv),
    msg
  })

  return { pin, challenge }
}

/**
 * CONSUMER: DELEGATION
 *
 * Decrypt the delegated credentials and forward to client implementation
 *
 * @param ls
 * @param data
 * @returns link success or null on error
 */
const linkDevice = async (ls: LinkingState, data: string): Promise<Maybe<boolean>> => {
  if (!ls.sessionKey) return null

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
  let linkResult = null

  if (response.linkStatus === "APPROVED") {
    await storage.setItem(USERNAME_STORAGE_KEY, ls.username)
    await auth.linkDevice(response.delegation)
    linkResult = true
  } else if (response.linkStatus === "DENIED") {
    linkResult = false
  }
  return linkResult
}