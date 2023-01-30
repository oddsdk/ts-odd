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


export type AccountLinkingProducer = {
  on: <K extends keyof ProducerEventMap>(eventName: K, listener: EventListener<ProducerEventMap[ K ]>) => void
  cancel: () => void
}

export interface ProducerEventMap {
  "challenge": {
    pin: number[]
    confirmPin: () => void
    rejectPin: () => void
  }
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
  sessionKey: Maybe<CryptoKey>
  step: Maybe<LinkingStep>
}

/**
 * Create an account linking producer
 *
 * @param options producer options
 * @param options.username username of the account
 * @returns an account linking event emitter and cancel function
 */
export const createProducer = async (
  dependencies: Dependencies,
  options: { username: string }
): Promise<AccountLinkingProducer> => {
  const { username } = options
  const handleLinkingError = (errorOrWarning: LinkingError | LinkingWarning) => Linking.handleLinkingError(dependencies.manners, errorOrWarning)
  const canDelegateAccount = await dependencies.auth.canDelegateAccount(username)

  if (!canDelegateAccount) {
    throw new LinkingError(`Producer cannot delegate account for username ${username}`)
  }

  let eventEmitter: Maybe<EventEmitter<ProducerEventMap>> = new EventEmitter()
  const ls: LinkingState = {
    username,
    sessionKey: null,
    step: LinkingStep.Broadcast
  }

  const handleMessage = async (event: MessageEvent): Promise<void> => {
    const { data } = event
    const message = data.arrayBuffer ? new TextDecoder().decode(await data.arrayBuffer()) : data

    switch (ls.step) {

      // Broadcast
      // ---------
      case LinkingStep.Broadcast: {
        const { sessionKey, sessionKeyMessage } = await generateSessionKey(dependencies.crypto, message)
        ls.sessionKey = sessionKey
        ls.step = LinkingStep.Negotiation
        return channel.send(sessionKeyMessage)
      }

      // Negotiation
      // -----------
      case LinkingStep.Negotiation:
        if (ls.sessionKey) {
          const userChallengeResult = await handleUserChallenge(dependencies.crypto, ls.sessionKey, message)
          ls.step = LinkingStep.Delegation

          if (userChallengeResult.ok) {
            const { pin, audience } = userChallengeResult.value

            const challengeOnce = () => {
              let called = false

              return {
                confirmPin: async () => {
                  if (!called) {
                    called = true

                    if (ls.sessionKey) {
                      await delegateAccount(
                        dependencies.auth,
                        dependencies.crypto,
                        ls.sessionKey,
                        username,
                        audience,
                        finishDelegation
                      )
                    } else {
                      handleLinkingError(new LinkingError("Producer missing session key when delegating account"))
                    }
                  }
                },
                rejectPin: async () => {
                  if (!called) {
                    called = true

                    if (ls.sessionKey) {
                      await declineDelegation(dependencies.crypto, ls.sessionKey, finishDelegation)
                    } else {
                      handleLinkingError(new LinkingError("Producer missing session key when declining account delegation"))
                    }
                  }
                }
              }
            }
            const { confirmPin, rejectPin } = challengeOnce()

            eventEmitter?.emit("challenge", { pin, confirmPin, rejectPin })
          } else {
            handleLinkingError(userChallengeResult.error)
          }

        } else {
          handleLinkingError(new LinkingError("Producer missing session key when handling user challenge"))
        }

        break

      // Delegation
      // ----------
      case LinkingStep.Delegation:
        return handleLinkingError(new LinkingWarning("Producer received an unexpected message while delegating an account. The message will be ignored."))

    }
  }

  const finishDelegation = async (delegationMessage: string, approved: boolean): Promise<void> => {
    await channel.send(delegationMessage)

    if (ls.username == null) return // or throw error?

    eventEmitter?.emit("link", { approved, username: ls.username })
    resetLinkingState()
  }

  const resetLinkingState = () => {
    ls.sessionKey = null
    ls.step = LinkingStep.Broadcast
  }

  const cancel = async () => {
    eventEmitter?.emit("done", undefined)
    eventEmitter = null
    channel.close()
  }

  const channel = await dependencies.auth.createChannel({ username, handleMessage })

  return {
    on: (...args) => eventEmitter?.on(...args),
    cancel
  }
}


/**
 * BROADCAST
 *
 * Generate a session key and prepare a session key message to send to the consumer.
 *
 * @param didThrowaway
 * @returns session key and session key message
 */
export const generateSessionKey = async (
  crypto: Crypto.Implementation,
  didThrowaway: string
): Promise<{ sessionKey: CryptoKey; sessionKeyMessage: string }> => {
  const sessionKey = await crypto.aes.genKey(Crypto.SymmAlg.AES_GCM)
  const exportedSessionKey = await crypto.aes.exportKey(sessionKey)

  const { publicKey } = DID.didToPublicKey(crypto, didThrowaway)

  const encryptedSessionKey = await crypto.rsa.encrypt(exportedSessionKey, publicKey)

  const u = await Ucan.build({
    dependencies: { crypto },

    issuer: await DID.ucan(crypto),
    audience: didThrowaway,
    lifetimeInSeconds: 60 * 5, // 5 minutes
    facts: [ { sessionKey: Uint8arrays.toString(exportedSessionKey, "base64pad") } ],
    potency: null
  })

  const iv = crypto.misc.randomNumbers({ amount: 16 })
  const msg = await crypto.aes.encrypt(
    Uint8arrays.fromString(Ucan.encode(u), "utf8"),
    sessionKey,
    Crypto.SymmAlg.AES_GCM,
    iv
  )

  const sessionKeyMessage = JSON.stringify({
    iv: Uint8arrays.toString(iv, "base64pad"),
    msg: Uint8arrays.toString(msg, "base64pad"),
    sessionKey: Uint8arrays.toString(encryptedSessionKey, "base64pad")
  })

  return {
    sessionKey,
    sessionKeyMessage
  }
}


/**
 * NEGOTIATION
 *
 * Decrypt the user challenge and the consumer audience DID.
 *
 * @param data
 * @returns pin and audience
 */
export const handleUserChallenge = async (
  crypto: Crypto.Implementation,
  sessionKey: CryptoKey,
  data: string
): Promise<Result<{ pin: number[]; audience: string }, Error>> => {
  const typeGuard = (message: unknown): message is { iv: string; msg: string } => {
    return Check.isObject(message)
      && "iv" in message && typeof message.iv === "string"
      && "msg" in message && typeof message.msg === "string"
  }

  const parseResult = tryParseMessage(data, typeGuard, { participant: "Producer", callSite: "handleUserChallenge" })

  if (parseResult.ok) {
    const { iv: encodedIV, msg } = parseResult.value
    const iv = Uint8arrays.fromString(encodedIV, "base64pad")

    let message = null
    try {
      message = await crypto.aes.decrypt(
        Uint8arrays.fromString(msg, "base64pad"),
        sessionKey,
        Crypto.SymmAlg.AES_GCM,
        iv
      )
    } catch {
      return { ok: false, error: new LinkingWarning("Ignoring message that could not be decrypted.") }
    }

    const json = JSON.parse(Uint8arrays.toString(message, "utf8"))
    const pin = json.pin as number[] ?? null
    const audience = json.did as string ?? null

    if (pin !== null && audience !== null) {
      return { ok: true, value: { pin, audience } }
    } else {
      return { ok: false, error: new LinkingError(`Producer received invalid pin ${json.pin} or audience ${json.audience}`) }
    }
  } else {
    return parseResult
  }

}


/**
 * DELEGATION: Delegate account
 *
 * Request delegation from the dependency injected delegateAccount function.
 * Prepare a delegation message to send to the consumer.
 *
 * @param sesionKey
 * @param audience
 * @param finishDelegation
 */
export const delegateAccount = async (
  auth: Auth.Implementation<Components>,
  crypto: Crypto.Implementation,
  sessionKey: CryptoKey,
  username: string,
  audience: string,
  finishDelegation: (delegationMessage: string, approved: boolean) => Promise<void>
): Promise<void> => {
  const delegation = await auth.delegateAccount(username, audience)
  const message = JSON.stringify(delegation)
  const iv = crypto.misc.randomNumbers({ amount: 16 })

  const msg = await crypto.aes.encrypt(
    Uint8arrays.fromString(message, "utf8"),
    sessionKey,
    Crypto.SymmAlg.AES_GCM,
    iv
  )

  const delegationMessage = JSON.stringify({
    iv: Uint8arrays.toString(iv, "base64pad"),
    msg: Uint8arrays.toString(msg, "base64pad")
  })

  await finishDelegation(delegationMessage, true)
}

/**
 * DELEGATION: Decline delegation
 *
 * Prepare a delegation declined message to send to the consumer.
 *
 * @param sessionKey
 * @param finishDelegation
 */
export const declineDelegation = async (
  crypto: Crypto.Implementation,
  sessionKey: CryptoKey,
  finishDelegation: (delegationMessage: string, approved: boolean) => Promise<void>
): Promise<void> => {
  const message = JSON.stringify({ linkStatus: "DENIED" })
  const iv = crypto.misc.randomNumbers({ amount: 16 })

  const msg = await crypto.aes.encrypt(
    Uint8arrays.fromString(message, "utf8"),
    sessionKey,
    Crypto.SymmAlg.AES_GCM,
    iv
  )

  const delegationMessage = JSON.stringify({
    iv: Uint8arrays.toString(iv, "base64pad"),
    msg: Uint8arrays.toString(msg, "base64pad")
  })

  await finishDelegation(delegationMessage, false)
}