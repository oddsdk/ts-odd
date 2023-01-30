import * as Uint8arrays from "uint8arrays"

import * as Auth from "../components/auth/implementation.js"
import * as Crypto from "../components/crypto/implementation.js"
import * as Manners from "../components/manners/implementation.js"

import * as Check from "../common/type-checks.js"
import * as DID from "../did/index.js"
import * as Linking from "./common.js"
import * as Ucan from "../ucan/index.js"

import { Components } from "../components.js"
import { EventEmitter, EventListener } from "../common/event-emitter.js"
import { LinkingError, LinkingStep, LinkingWarning, tryParseMessage } from "./common.js"

import type { Maybe, Result } from "../common/index.js"


export type AccountLinkingConsumer = {
  on: <K extends keyof ConsumerEventMap>(eventName: K, listener: EventListener<ConsumerEventMap[ K ]>) => void
  cancel: () => void
}

export interface ConsumerEventMap {
  "challenge": { pin: number[] }
  "link": { approved: boolean; username: string }
  "done": undefined
}

export type Dependencies = {
  auth: Auth.Implementation<Components>
  crypto: Crypto.Implementation
  manners: Manners.Implementation
}

type LinkingState = {
  username: Maybe<string>
  sessionKey: Maybe<Uint8Array>
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
export const createConsumer = async (
  dependencies: Dependencies,
  options: { username: string }
): Promise<AccountLinkingConsumer> => {
  const { username } = options
  const handleLinkingError = (errorOrWarning: LinkingError | LinkingWarning) => Linking.handleLinkingError(dependencies.manners, errorOrWarning)

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

    switch (ls.step) {

      // Broadcast
      // ---------
      case LinkingStep.Broadcast:
        return handleLinkingError(new LinkingWarning("Consumer is not ready to start linking"))

      // Negotiation
      // -----------
      case LinkingStep.Negotiation:
        if (ls.sessionKey) {
          handleLinkingError(new LinkingWarning("Consumer already received a session key"))
        } else if (!ls.temporaryRsaPair || !ls.temporaryRsaPair.privateKey) {
          handleLinkingError(new LinkingError("Consumer missing RSA key pair when handling session key message"))
        } else {
          const sessionKeyResult = await handleSessionKey(
            dependencies.crypto,
            ls.temporaryRsaPair.privateKey,
            message
          )

          if (sessionKeyResult.ok) {
            ls.sessionKey = sessionKeyResult.value

            const { pin, challenge } = await generateUserChallenge(dependencies.crypto, ls.sessionKey)
            channel.send(challenge)
            eventEmitter?.emit("challenge", { pin: Array.from(pin) })
            ls.step = LinkingStep.Delegation
          } else {
            handleLinkingError(sessionKeyResult.error)
          }
        }

        break

      // Delegation
      // ----------
      case LinkingStep.Delegation:
        if (!ls.sessionKey) {
          handleLinkingError(new LinkingError("Consumer was missing session key when linking device"))
        } else if (!ls.username) {
          handleLinkingError(new LinkingError("Consumer was missing username when linking device"))
        } else {
          const linkingResult = await linkDevice(
            dependencies.auth,
            dependencies.crypto,
            ls.sessionKey,
            ls.username,
            message
          )

          if (linkingResult.ok) {
            const { approved } = linkingResult.value
            eventEmitter?.emit("link", { approved, username: ls.username })
            await done()
          } else {
            handleLinkingError(linkingResult.error)
          }
        }

        break

    }
  }

  const done = async () => {
    eventEmitter?.emit("done", undefined)
    eventEmitter = null
    channel.close()
    clearInterval(rsaExchangeInterval)
  }

  const channel = await dependencies.auth.createChannel({ handleMessage, username })

  const rsaExchangeInterval = setInterval(async () => {
    if (!ls.sessionKey) {
      const { temporaryRsaPair, temporaryDID } = await generateTemporaryExchangeKey(dependencies.crypto)
      ls.temporaryRsaPair = temporaryRsaPair
      ls.step = LinkingStep.Negotiation

      channel.send(temporaryDID)
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
export const generateTemporaryExchangeKey = async (
  crypto: Crypto.Implementation
): Promise<{ temporaryRsaPair: CryptoKeyPair; temporaryDID: string }> => {
  const temporaryRsaPair = await crypto.rsa.genKey()
  const pubKey = await crypto.rsa.exportPublicKey(temporaryRsaPair.publicKey)

  const temporaryDID = DID.publicKeyToDid(crypto, pubKey, "rsa")
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
export const handleSessionKey = async (
  crypto: Crypto.Implementation,
  temporaryRsaPrivateKey: CryptoKey,
  data: string
): Promise<Result<Uint8Array, Error>> => {
  const typeGuard = (message: unknown): message is { iv: string; msg: string; sessionKey: string } => {
    return Check.isObject(message)
      && "iv" in message && typeof message.iv === "string"
      && "msg" in message && typeof message.msg === "string"
      && "sessionKey" in message && typeof message.sessionKey === "string"
  }

  const parseResult = tryParseMessage(data, typeGuard, { participant: "Consumer", callSite: "handleSessionKey" })

  if (parseResult.ok) {
    const { iv: encodedIV, msg, sessionKey: encodedSessionKey } = parseResult.value
    const iv = Uint8arrays.fromString(encodedIV, "base64pad")

    let sessionKey
    try {
      const encryptedSessionKey = Uint8arrays.fromString(encodedSessionKey, "base64pad")
      sessionKey = await crypto.rsa.decrypt(encryptedSessionKey, temporaryRsaPrivateKey)
    } catch {
      return { ok: false, error: new LinkingWarning(`Consumer received a session key in handleSessionKey that it could not decrypt: ${data}. Ignoring message`) }
    }

    let encodedUcan = null
    try {
      encodedUcan = await crypto.aes.decrypt(
        Uint8arrays.fromString(msg, "base64pad"),
        sessionKey,
        Crypto.SymmAlg.AES_GCM,
        iv
      )
    } catch {
      return { ok: false, error: new LinkingError("Consumer could not decrypt closed UCAN with provided session key.") }
    }

    const decodedUcan = Ucan.decode(
      Uint8arrays.toString(encodedUcan, "utf8")
    )

    if (await Ucan.isValid(crypto, decodedUcan) === false) {
      return { ok: false, error: new LinkingError("Consumer received an invalid closed UCAN") }
    }

    if (decodedUcan.payload.ptc) {
      return { ok: false, error: new LinkingError("Consumer received a closed UCAN with potency. Closed UCAN must not have potency.") }
    }

    const sessionKeyFromFact = decodedUcan.payload.fct[ 0 ] && decodedUcan.payload.fct[ 0 ].sessionKey
    if (!sessionKeyFromFact) {
      return { ok: false, error: new LinkingError("Consumer received a closed UCAN that was missing a session key in facts.") }
    }

    const sessionKeyWeAlreadyGot = Uint8arrays.toString(sessionKey, "base64pad")
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
export const generateUserChallenge = async (
  crypto: Crypto.Implementation,
  sessionKey: Uint8Array
): Promise<{ pin: number[]; challenge: string }> => {
  const pin = Array.from(crypto.misc.randomNumbers({ amount: 6 })).map(n => n % 9)
  const iv = crypto.misc.randomNumbers({ amount: 16 })

  const msg = await crypto.aes.encrypt(
    Uint8arrays.fromString(
      JSON.stringify({
        did: await DID.ucan(crypto),
        pin
      }),
      "utf8"
    ),
    sessionKey,
    Crypto.SymmAlg.AES_GCM,
    iv
  )

  const challenge = JSON.stringify({
    iv: Uint8arrays.toString(iv, "base64pad"),
    msg: Uint8arrays.toString(msg, "base64pad")
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
export const linkDevice = async (
  auth: Auth.Implementation<Components>,
  crypto: Crypto.Implementation,
  sessionKey: Uint8Array,
  username: string,
  data: string
): Promise<Result<{ approved: boolean }, Error>> => {
  const typeGuard = (message: unknown): message is { iv: string; msg: string } => {
    return Check.isObject(message)
      && "iv" in message && typeof message.iv === "string"
      && "msg" in message && typeof message.msg === "string"
  }

  const parseResult = tryParseMessage(data, typeGuard, { participant: "Consumer", callSite: "linkDevice" })

  if (parseResult.ok) {
    const { iv: encodedIV, msg } = parseResult.value
    const iv = Uint8arrays.fromString(encodedIV, "base64")

    let message = null
    try {
      message = await crypto.aes.decrypt(
        Uint8arrays.fromString(msg, "base64pad"),
        sessionKey,
        Crypto.SymmAlg.AES_GCM,
        iv
      )
    } catch {
      return { ok: false, error: new LinkingWarning("Consumer ignoring message that could not be decrypted in linkDevice.") }
    }

    const response = tryParseMessage(
      Uint8arrays.toString(message, "utf8"),
      Check.isObject,
      { participant: "Consumer", callSite: "linkDevice" }
    )

    if (!response.ok) {
      return response
    }

    if (response?.value.linkStatus === "DENIED") {
      return { ok: true, value: { approved: false } }
    }

    await auth.linkDevice(username, response.value)

    return { ok: true, value: { approved: true } }
  } else {
    return parseResult
  }
}
