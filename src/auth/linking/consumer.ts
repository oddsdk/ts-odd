import aes from "keystore-idb/aes/index.js"
import config from "keystore-idb/config.js"
import rsa from "keystore-idb/rsa/index.js"
import utils from "keystore-idb/utils.js"
import { KeyUse, SymmAlg } from "keystore-idb/types.js"

import { webcrypto } from "one-webcrypto"
import * as uint8arrays from "uint8arrays"

import * as check from "../../common/type-checks.js"
import * as did from "../../did/index.js"
import * as storage from "../../storage/index.js"
import * as ucan from "../../ucan/index.js"
import { impl as auth } from "../implementation.js"
import { EventEmitter, EventListener } from "../../common/event-emitter.js"
import { USERNAME_STORAGE_KEY } from "../../common/index.js"
import { LinkingError, LinkingStep, LinkingWarning, handleLinkingError, tryParseMessage } from "../linking.js"

import type { Maybe, Result } from "../../common/index.js"


export type AccountLinkingConsumer = {
  on: <K extends keyof ConsumerEventMap>(eventName: K, listener: EventListener<ConsumerEventMap[K]>) => void
  cancel: () => void
}
export interface ConsumerEventMap {
  "challenge": { pin: number[] }
  "link": { approved: boolean; username: string }
  "done": undefined
}

type LinkingState = {
  username: Maybe<string>
  sessionKey: Maybe<CryptoKey>
  temporaryRsaPair: Maybe<CryptoKeyPair>
  step: Maybe<LinkingStep>
}

/**
 * Create an account linking consumer
 *
 * @param options consumer options
 * @param options.username username of the account
 * @returns an account linking event emitter and cancel function
 */
export const createConsumer = async (options: { username: string }): Promise<AccountLinkingConsumer> => {
  const { username } = options
  let eventEmitter: Maybe<EventEmitter<ConsumerEventMap>> = new EventEmitter()
  const ls: LinkingState = {
    username,
    sessionKey: null,
    temporaryRsaPair: null,
    step: LinkingStep.Broadcast
  }

  const handleMessage = async (event: MessageEvent): Promise<void> => {
    const { data } = event
    const message = data.arrayBuffer ? new TextDecoder().decode(await data.arrayBuffer()) : data

    if (ls.step === LinkingStep.Broadcast) {
      handleLinkingError(new LinkingWarning("Consumer is not ready to start linking"))
    } else if (ls.step === LinkingStep.Negotiation) {
      if (ls.sessionKey) {
        handleLinkingError(new LinkingWarning("Consumer already received a session key"))
      } else if (!ls.temporaryRsaPair || !ls.temporaryRsaPair.privateKey) {
        handleLinkingError(new LinkingError("Consumer missing RSA key pair when handling session key message"))
      } else {
        const sessionKeyResult = await handleSessionKey(ls.temporaryRsaPair.privateKey, message)

        if (sessionKeyResult.ok) {
          ls.sessionKey = sessionKeyResult.value

          const { pin, challenge } = await generateUserChallenge(ls.sessionKey)
          channel.send(challenge)
          eventEmitter?.emit("challenge", { pin: Array.from(pin) })
          ls.step = LinkingStep.Delegation
        } else {
          handleLinkingError(sessionKeyResult.error)
        }
      }
    } else if (ls.step === LinkingStep.Delegation) {
      if (!ls.sessionKey) {
        handleLinkingError(new LinkingError("Consumer was missing session key when linking device"))
      } else if (!ls.username) {
        handleLinkingError(new LinkingError("Consumer was missing username when linking device"))
      } else {
        const linkingResult = await linkDevice(ls.sessionKey, ls.username, message)

        if (linkingResult.ok) {
          const { approved } = linkingResult.value
          eventEmitter?.emit("link", { approved, username: ls.username })
          await done()
        } else {
          handleLinkingError(linkingResult.error)
        }
      }
    }
  }

  const done = async () => {
    eventEmitter?.emit("done", undefined)
    eventEmitter = null
    channel.close()
    clearInterval(rsaExchangeInterval)
  }

  const channel = await auth.createChannel({ username, handleMessage })

  const rsaExchangeInterval = setInterval(async () => {
    if (!ls.sessionKey) {
      const { temporaryRsaPair, temporaryDID } = await generateTemporaryExchangeKey()
      ls.temporaryRsaPair = temporaryRsaPair
      ls.step = LinkingStep.Negotiation

      await channel.send(temporaryDID)
    } else {
      clearInterval(rsaExchangeInterval)
    }
  }, 2000)

  return {
    on: (...args) => eventEmitter?.on(...args),
    cancel: done
  }
}


// 🔗 Device Linking Steps

/**
 *  BROADCAST
 *
 * Generate a temporary RSA keypair and extract a temporary DID from it.
 * The temporary DID will be broadcast on the channel to start the linking process.
 *
 * @returns temporary RSA key pair and temporary DID
 */
export const generateTemporaryExchangeKey = async (): Promise<{ temporaryRsaPair: CryptoKeyPair; temporaryDID: string }> => {
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
 * Decrypt the session key and check the closed UCAN for capability.
 * The session key is encrypted with the temporary RSA keypair.
 * The closed UCAN is encrypted with the session key.
 *
 * @param temporaryRsaPrivateKey
 * @param data
 * @returns AES session key
 */
export const handleSessionKey = async (temporaryRsaPrivateKey: CryptoKey, data: string): Promise<Result<CryptoKey, Error>> => {
  const typeGuard = (message: unknown): message is { iv: string; msg: string; sessionKey: string } => {
    return check.isObject(message)
      && "iv" in message && typeof message.iv === "string"
      && "msg" in message && typeof message.msg === "string"
      && "sessionKey" in message && typeof message.sessionKey === "string"
  }

  const parseResult = tryParseMessage(data, typeGuard, { participant: "Consumer", callSite: "handleSessionKey" })

  if (parseResult.ok) {
    const { iv: encodedIV, msg, sessionKey: encodedSessionKey } = parseResult.value
    const iv = utils.base64ToArrBuf(encodedIV)

    let sessionKey, rawSessionKey
    try {
      const encryptedSessionKey = utils.base64ToArrBuf(encodedSessionKey)
      rawSessionKey = await rsa.decrypt(encryptedSessionKey, temporaryRsaPrivateKey)
      sessionKey = await aes.importKey(utils.arrBufToBase64(rawSessionKey), { alg: SymmAlg.AES_GCM, length: 256 })
    } catch {
      return { ok: false, error: new LinkingWarning(`Consumer received a session key in handleSessionKey that it could not decrypt: ${data}. Ignoring message`) }
    }

    let encodedUcan = null
    try {
      encodedUcan = uint8arrays.toString(
        await webcrypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv,
          },
          sessionKey,
          utils.base64ToArrBuf(msg),
        ),
        "utf8"
      )
    } catch {
      return { ok: false, error: new LinkingError("Consumer could not decrypt closed UCAN with provided session key.") }
    }

    const decodedUcan = ucan.decode(encodedUcan)

    if (await ucan.isValid(decodedUcan) === false) {
      return { ok: false, error: new LinkingError("Consumer received an invalid closed UCAN") }
    }

    if (decodedUcan.payload.ptc) {
      return { ok: false, error: new LinkingError("Consumer received a closed UCAN with potency. Closed UCAN must not have potency.") }
    }

    const sessionKeyFromFact = decodedUcan.payload.fct[0] && decodedUcan.payload.fct[0].sessionKey
    if (!sessionKeyFromFact) {
      return { ok: false, error: new LinkingError("Consumer received a closed UCAN that was missing a session key in facts.") }
    }

    const sessionKeyWeAlreadyGot = utils.arrBufToBase64(rawSessionKey)
    if (sessionKeyFromFact !== sessionKeyWeAlreadyGot) {
      return { ok: false, error: new LinkingError("Consumer received a closed UCAN session key does not match the session key") }
    }

    return { ok: true, value: sessionKey }
  } else {
    return parseResult
  }
}


/**
 * NEGOTIATION
 *
 * Generate pin and challenge message for verification by the producer.
 *
 * @param sessionKey
 * @returns pin and challenge message
 */
export const generateUserChallenge = async (sessionKey: CryptoKey): Promise<{ pin: number[]; challenge: string }> => {
  const pin = Array.from(new Uint8Array(utils.randomBuf(6, { max: 9 })))

  const iv = utils.randomBuf(16)
  const msg = utils.arrBufToBase64(
    await webcrypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      sessionKey,
      uint8arrays.fromString(
        JSON.stringify({
          did: await did.ucan(),
          pin
        }),
        "utf8"
      ),
    )
  )

  const challenge = JSON.stringify({
    iv: utils.arrBufToBase64(iv),
    msg
  })

  return { pin, challenge }
}

/**
 * DELEGATION
 *
 * Decrypt the delegated credentials and forward to the dependency injected linkDevice function,
 * or report that delegation was declined.
 *
 * @param sessionKey
 * @param username
 * @param data
 * @returns linking result
 */
export const linkDevice = async (sessionKey: CryptoKey, username: string, data: string): Promise<Result<{ approved: boolean }, Error>> => {
  const typeGuard = (message: unknown): message is { iv: string; msg: string } => {
    return check.isObject(message)
      && "iv" in message && typeof message.iv === "string"
      && "msg" in message && typeof message.msg === "string"
  }

  const parseResult = tryParseMessage(data, typeGuard, { participant: "Consumer", callSite: "linkDevice" })

  if (parseResult.ok) {
    const { iv: encodedIV, msg } = parseResult.value
    const iv = utils.base64ToArrBuf(encodedIV)

    let message = null
    try {
      message = uint8arrays.toString(
        await webcrypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv,
          },
          sessionKey,
          utils.base64ToArrBuf(msg),
        ),
        "utf8"
      )
    } catch {
      return { ok: false, error: new LinkingWarning("Consumer ignoring message that could not be decrypted in linkDevice.") }
    }

    const response = tryParseMessage(message, check.isObject, { participant: "Consumer", callSite: "linkDevice" })
    if (!response.ok) {
      return response
    }

    if (response.value.linkStatus === "DENIED") {
      return { ok: true, value: { approved: false } }
    }

    await storage.setItem(USERNAME_STORAGE_KEY, username)
    await auth.linkDevice(response.value)

    return { ok: true, value: { approved: true } }
  } else {
    return parseResult
  }
}
