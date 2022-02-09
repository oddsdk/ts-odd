import aes from "keystore-idb/lib/aes/index.js"
import config from "keystore-idb/lib/config.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse,SymmAlg } from "keystore-idb/lib/types.js"
import * as auth from "../index.js"
import * as did from "../../did/index.js"
import * as ucan from "../../ucan/index.js"
import * as storage from "../../storage/index.js"
import { EventEmitter } from "../../common/event-emitter"
import { USERNAME_STORAGE_KEY } from "../../common/index.js"
import { LinkingError, LinkingWarning, handleLinkingError } from "../linking.js"

import type { EventListener } from "../../common/event-emitter"
import type { Maybe, Result } from "../../common/index.js"

type AccountLinkingConsumer = {
  on: OnChallenge & OnLink & OnDone
  cancel: () => void
}

type OnChallenge = (event: "challenge", listener: (args: { pin: number[] }) => void) => void
type OnLink = (event: "link", listener: (args: { approved: boolean; username: string }) => void) => void
type OnDone = (event: "done", listener: () => void) => void

type LinkingStep = "BROADCAST" | "NEGOTIATION" | "DELEGATION"

type LinkingState = {
  username: Maybe<string>
  sessionKey: Maybe<CryptoKey>
  temporaryRsaPair: Maybe<CryptoKeyPair>
  step: Maybe<LinkingStep>
}

export const createConsumer = async (options: { username: string; timeout?: number }): Promise<AccountLinkingConsumer> => {
  const { username } = options
  let eventEmitter: Maybe<EventEmitter> = new EventEmitter()
  const ls: LinkingState = {
    username,
    sessionKey: null,
    temporaryRsaPair: null,
    step: "BROADCAST"
  }

  const handleMessage = async (event: MessageEvent): Promise<void> => {
    const { data } = event
    const message = new TextDecoder().decode(data.arrayBuffer ? await data.arrayBuffer() : data)
    console.debug("message (raw)", message)

    if (ls.step === "NEGOTIATION") {
      const sessionKeyResult = await handleSessionKey(ls, message)

      if (sessionKeyResult.ok) {
        ls.sessionKey = sessionKeyResult.value

        const { pin, challenge } = await generateUserChallenge(ls.sessionKey)
        channel.send(challenge)
        eventEmitter?.dispatchEvent("challenge", { pin: Array.from(pin) })
        ls.step = "DELEGATION"
        // nullify temporaryRsaKey? It has served its purpose
      } else {
        handleLinkingError(sessionKeyResult.error)
      }
    } else if (ls.step === "DELEGATION") {
      const linkingResult = await linkDevice(ls, message) 

      if (linkingResult.ok) {
        const { approved } = linkingResult.value
        eventEmitter?.dispatchEvent("link", { approved, username: ls.username })
      } else {
        handleLinkingError(linkingResult.error)
      }

      await done()
    }
  }

  const done = async () => {
    eventEmitter?.dispatchEvent("done")
    eventEmitter = null
    channel.close()
    // reset linking state?
  }

  const channel = await auth.createChannel({ username, handleMessage })
  const { temporaryRsaPair, temporaryDID } = await generateTemporaryExchangeKey()
  ls.temporaryRsaPair = temporaryRsaPair
  ls.step = "NEGOTIATION"

  await channel.send(temporaryDID)

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
const generateTemporaryExchangeKey = async (): Promise<{ temporaryRsaPair: CryptoKeyPair; temporaryDID: string }> => {
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
 * The Consumer receives the session key and validates the closed UCAN. 
 * 
 * @param ls
 * @param data 
 * @returns AES session key
 */
const handleSessionKey = async (ls: LinkingState, data: string): Promise<Result<CryptoKey, Error>> => {
  if (!ls.temporaryRsaPair || !ls.temporaryRsaPair.privateKey) {
    return { ok: false, error: new LinkingError("Consumer missing RSA key pair when handling session key message") }
  }

  if (ls.sessionKey) {
    return { ok: false, error: new LinkingWarning("Consumer already received a session key") }
  }

  const { iv, msg, sessionKey: encodedSessionKey } = JSON.parse(data)

  if (!iv) {
    return { ok: false, error: new LinkingError("Consumer could not handle session key message because `iv` was missing") }
  }

  const encryptedSessionKey = utils.base64ToArrBuf(encodedSessionKey)
  const rawSessionKey = await rsa.decrypt(encryptedSessionKey, ls.temporaryRsaPair.privateKey)
  const sessionKey = await aes.importKey(utils.arrBufToBase64(rawSessionKey), { alg: SymmAlg.AES_GCM, length: 256 })

  // Extract UCAN
  let encodedUcan = null

  try {
    encodedUcan = await aes.decrypt(
      msg,
      sessionKey,
      {
        alg: SymmAlg.AES_GCM,
        iv: iv
      }
    )
  } catch (_) {
    return { ok: false, error: new LinkingError("Could not decrypt closed UCAN with provided session key.") }
  }

  const decodedUcan = ucan.decode(encodedUcan)

  if (await ucan.isValid(decodedUcan) === false) {
    return { ok: false, error: new LinkingError("Invalid closed UCAN") }
  }

  if (decodedUcan.payload.ptc) {
    return { ok: false, error: new LinkingError("Invalid closed UCAN: must not have any potency") }
  }

  const sessionKeyFromFact = decodedUcan.payload.fct[0] && decodedUcan.payload.fct[0].sessionKey
  if (!sessionKeyFromFact) {
    return { ok: false, error: new LinkingError("Session key is missing from closed UCAN") }
  }

  const sessionKeyWeAlreadyGot = utils.arrBufToBase64(rawSessionKey)
  if (sessionKeyFromFact !== sessionKeyWeAlreadyGot) {
    return { ok: false, error: new LinkingError("Closed UCAN session key does not match session key") }
  }

  return { ok: true, value: sessionKey }
}


/**
 * NEGOTIATION (response)
 * 
 * Encrypt and publish the CONSUMER did and generated pin for verification by the PRODUCER.
 * 
 * @param pin 
 * @returns pin and challenge message
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
 * @returns linking result
 */
const linkDevice = async (ls: LinkingState, data: string): Promise<Result<{ approved: boolean }, Error>> => {
  if (!ls.sessionKey) return { ok: false, error: new LinkingError("Consumer missing session key when linking device") }

  const { iv, msg } = JSON.parse(data)

  if (!iv) {
    return { ok: false, error: new LinkingError("Consumer could not handle link device message because `iv` was missing") }
  }

  let message = null
  try {
    message = await aes.decrypt(
      msg,
      ls.sessionKey,
      {
        alg: SymmAlg.AES_GCM,
        iv: iv
      }
    )
  } catch (_) {
    return { ok: false, error: new LinkingWarning("Ignoring message that could not be decrypted.") }
  }

  const response = JSON.parse(message)

  if (response.linkStatus === "APPROVED") {
    await storage.setItem(USERNAME_STORAGE_KEY, ls.username)
    await auth.linkDevice(response.delegation)

    return { ok: true, value: { approved: true }}
  } else if (response.linkStatus === "DENIED") {
    return { ok: true, value: { approved: false }}
  } else {
    return { ok: false, error: new LinkingError("Invalid linking message received from producer.") }
  }
}