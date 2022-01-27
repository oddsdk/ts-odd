import aes from "keystore-idb/lib/aes/index.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg, HashAlg, CharSize } from "keystore-idb/lib/types.js"
import * as did from "../../did/index.js"
import * as ucan from "../../ucan/index.js"
import * as auth from "../index.js"
import { publishOnChannel } from "../index.js"
import { EventEmitter } from "../../common/event-emitter"
import { setLinkingRole } from "../linking/switch.js"

import type { Maybe } from "../../common/index.js"
import type { EventListener } from "../../common/event-emitter"

type AccountLinkingProducer = {
  on: OnChallenge & OnLink & OnError & OnDone
  cancel: () => void
}

type OnChallenge = (
  event: "challenge",
  listener: (
    args: {
      pin: number[]
      confirmPin: () => void
      rejectPin: () => void
    }
  ) => void
) => void
type OnLink = (event: "link", listener: (args: { username: string }) => void) => void
type OnError = (event: "error", listener: (args: { err: Error }) => void) => void
type OnDone = (event: "done", listener: () => void) => void

type LinkingStep = "BROADCAST" | "NEGOTIATION" | "DELEGATION"

type LinkingState = {
  username: Maybe<string>
  sessionKey: Maybe<CryptoKey>
  temporaryRsaPair: Maybe<CryptoKeyPair>
  step: Maybe<LinkingStep>
}

let eventEmitter: Maybe<EventEmitter> = null

const ls: LinkingState = {
  username: null,
  sessionKey: null,
  temporaryRsaPair: null,
  step: null
}


export const createProducer = async (config: { username: string; timeout?: number }): Promise<AccountLinkingProducer> => {
  if (eventEmitter === null) {
    eventEmitter = new EventEmitter()
    setLinkingRole("PRODUCER")
    ls.step = "BROADCAST"
    ls.username = config.username
    await auth.openChannel(ls.username)
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
  ls.sessionKey = null
  ls.temporaryRsaPair = null
  ls.step = null
}


export const handleMessage = async (message: string): Promise<void> => {
  if (ls.step === "BROADCAST") {
    await sendSessionKey(message)
  } else if (ls.step === "NEGOTIATION") {
    await handleUserChallenge(message)
  } else if (ls.step === "DELEGATION") {
    // Noop
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


/**
 * BROADCAST
 * 
 * This should be called by the PRODUCER upon receiving the throwaway DID key.
 * 
 * @param didThrowaway 
 */
const sendSessionKey = async (didThrowaway: string): Promise<void> => {
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
 * NEGOTIATION
 * 
 * PRODUCER receives the DID & challenge PIN from the CONSUMER.
 * 
 * @param data 
 * @returns 
 */
const handleUserChallenge = async (data: string): Promise<Maybe<string>> => {
  if (!ls.sessionKey) return null

  const { iv, msg } = JSON.parse(data)

  if (!iv) {
    throw new Error("I tried to decrypt some data (with AES) but the `iv` was missing from the message")
  }

  const message = await aes.decrypt(msg, ls.sessionKey, {
    alg: SymmAlg.AES_GCM,
    iv
  })

  const json = JSON.parse(message)
  const pin = Object.values(json.pin) as number[] ?? null
  const audience = json.did as string ?? null

  if (pin !== null && audience !== null) {
    eventEmitter?.dispatchEvent("challenge", { pin, confirmPin: delegateAccount(audience), rejectPin: () => cancel() })
    nextStep()
  }

  return null
}


/**
 * DELEGATION
 * 
 * This step is user initiated by a callback that may accept or reject delegation.
 * The dependency injected auth.delegateAccount creates a UCAN with delegate rights and any other keys for the CONSUMER. 
 * 
 * @param audience
 * @returns
 */
const delegateAccount = (audience: string): () => Promise<void> => {
  return async function () {
    if (!ls.sessionKey) return

    const delegation = await auth.delegateAccount(audience)
    const message = JSON.stringify(delegation)

    const iv = utils.randomBuf(16)
    const msg = await aes.encrypt(message, ls.sessionKey, { iv, alg: SymmAlg.AES_GCM })

    await publishOnChannel(
      JSON.stringify({
        iv: utils.arrBufToBase64(iv),
        msg
      })
    )

    eventEmitter?.dispatchEvent("link", { username: ls.username })
    resetLinkingState()
  }
}
