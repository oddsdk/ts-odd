import aes from "keystore-idb/lib/aes/index.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg, HashAlg, CharSize } from "keystore-idb/lib/types.js"

import { webcrypto } from "one-webcrypto"
import * as uint8arrays from "uint8arrays"

import * as check from "../../common/type-checks.js"
import * as did from "../../did/index.js"
import * as ucan from "../../ucan/index.js"
import { impl as auth } from "../implementation.js"
import { EventEmitter, EventListener } from "../../common/event-emitter.js"
import { LinkingError, LinkingStep, LinkingWarning, handleLinkingError, tryParseMessage } from "../linking.js"

import type { Maybe, Result } from "../../common/index.js"


export type AccountLinkingProducer = {
  on: <K extends keyof ProducerEventMap>(eventName: K, listener: EventListener<ProducerEventMap[K]>) => void
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
export const createProducer = async (options: { username: string }): Promise<AccountLinkingProducer> => {
  const { username } = options
  const canDelegate = await auth.checkCapability(username)

  if (!canDelegate) {
    throw new LinkingError(`Producer cannot delegate for username ${username}`)
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

    if (ls.step === LinkingStep.Broadcast) {
      const { sessionKey, sessionKeyMessage } = await generateSessionKey(message)
      ls.sessionKey = sessionKey
      ls.step = LinkingStep.Negotiation
      channel.send(sessionKeyMessage)
    } else if (ls.step === LinkingStep.Negotiation) {
      if (ls.sessionKey) {
        const userChallengeResult = await handleUserChallenge(ls.sessionKey, message)
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
                    await delegateAccount(ls.sessionKey, username, audience, finishDelegation)
                  } else {
                    handleLinkingError(new LinkingError("Producer missing session key when delegating account"))
                  }
                }
              },
              rejectPin: async () => {
                if (!called) {
                  called = true

                  if (ls.sessionKey) {
                    await declineDelegation(ls.sessionKey, finishDelegation)
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
    } else if (ls.step === LinkingStep.Delegation) {
      handleLinkingError(new LinkingWarning("Producer received an unexpected message while delegating an account. The message will be ignored."))
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

  const channel = await auth.createChannel({ username, handleMessage })

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
export const generateSessionKey = async (didThrowaway: string): Promise<{ sessionKey: CryptoKey; sessionKeyMessage: string }> => {
  const sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM, length: 256 })

  const exportedSessionKey = await aes.exportKey(sessionKey)

  const { publicKey } = did.didToPublicKey(didThrowaway)
  const publicCryptoKey = await rsa.importPublicKey(publicKey, HashAlg.SHA_256, KeyUse.Exchange)

  // Note: rsa.encrypt expects a B16 string
  const rawSessionKey = utils.arrBufToStr(utils.base64ToArrBuf(exportedSessionKey), CharSize.B16)
  const encryptedSessionKey = await rsa.encrypt(rawSessionKey, publicCryptoKey)

  const u = await ucan.build({
    issuer: await did.ucan(),
    audience: didThrowaway,
    lifetimeInSeconds: 60 * 5, // 5 minutes
    facts: [{ sessionKey: exportedSessionKey }],
    potency: null
  })

  const iv = utils.randomBuf(16)
  const msg = utils.arrBufToBase64(
    await webcrypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      sessionKey,
      uint8arrays.fromString(ucan.encode(u), "utf8"),
    ),
  )

  const sessionKeyMessage = JSON.stringify({
    iv: utils.arrBufToBase64(iv),
    msg,
    sessionKey: utils.arrBufToBase64(encryptedSessionKey)
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
export const handleUserChallenge = async (sessionKey: CryptoKey, data: string): Promise<Result<{ pin: number[]; audience: string }, Error>> => {
  const typeGuard = (message: unknown): message is { iv: string; msg: string } => {
    return check.isObject(message)
      && "iv" in message && typeof message.iv === "string"
      && "msg" in message && typeof message.msg === "string"
  }

  const parseResult = tryParseMessage(data, typeGuard, { participant: "Producer", callSite: "handleUserChallenge" })

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
      return { ok: false, error: new LinkingWarning("Ignoring message that could not be decrypted.") }
    }

    const json = JSON.parse(message)
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
  sessionKey: CryptoKey,
  username: string,
  audience: string,
  finishDelegation: (delegationMessage: string, approved: boolean) => Promise<void>
): Promise<void> => {
  const delegation = await auth.delegateAccount(username, audience)
  const message = JSON.stringify(delegation)

  const iv = utils.randomBuf(16)
  const msg = utils.arrBufToBase64(
    await webcrypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      sessionKey,
      uint8arrays.fromString(message, "utf8"),
    ),
  )

  const delegationMessage = JSON.stringify({
    iv: utils.arrBufToBase64(iv),
    msg
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
  sessionKey: CryptoKey,
  finishDelegation: (delegationMessage: string, approved: boolean) => Promise<void>
): Promise<void> => {
  const message = JSON.stringify({ linkStatus: "DENIED" })

  const iv = utils.randomBuf(16)
  const msg = utils.arrBufToBase64(
    await webcrypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      sessionKey,
      uint8arrays.fromString(message, "utf8"),
    ),
  )

  const delegationMessage = JSON.stringify({
    iv: utils.arrBufToBase64(iv),
    msg
  })

  await finishDelegation(delegationMessage, false)
}