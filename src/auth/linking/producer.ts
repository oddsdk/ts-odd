import aes from "keystore-idb/lib/aes/index.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg, HashAlg, CharSize } from "keystore-idb/lib/types.js"
import * as did from "../../did/index.js"
import * as ucan from "../../ucan/index.js"
import * as auth from "../index.js"
import { setLinkingRole } from "../linking/switch.js"
import { publishOnChannel } from "../index.js"

type LinkingStep = "BROADCAST" | "NEGOTIATION" | "DELEGATION"

type LinkingState = {
  sessionKey: CryptoKey | null
  temporaryRsaPair: CryptoKeyPair | null
  step: LinkingStep | null
}

export type ChallengeCallback = (
  challenge:
    {
      pin: number[]
      afterChallenge: (challengeResponse: { userConfirmedPin: boolean }) => Promise<void>
    }
) => void

let challengeUser: ChallengeCallback
let reportCompletion: () => void

const ls: LinkingState = {
  sessionKey: null,
  temporaryRsaPair: null,
  step: null
}

const resetLinkingState = () => {
  ls.sessionKey = null
  ls.temporaryRsaPair = null
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

export const startLinkingProducer = async (
  config: {
    username: string
    onChallenge: ChallengeCallback
    onCompletion: () => void
  }
): Promise<null> => {
  setLinkingRole("PRODUCER")
  ls.step = "BROADCAST"
  challengeUser = config.onChallenge
  reportCompletion = config.onCompletion

  await auth.openChannel(config.username)
  return null
}

export const handleMessage = async (message: string): Promise<void> => {
  console.debug("Linking Status", ls)

  if (ls.step === "BROADCAST") {
    await sendSessionKey(message)
  } else if (ls.step === "NEGOTIATION") {
    await handleUserChallenge(message)
  } else if (ls.step === "DELEGATION") {
    console.log("noop")
  }
}


/**
 * BROADCAST
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
 * NEGOTIATION
 * 
 * PRODUCER receives the DID & challenge PIN from the CONSUMER.
 * 
 * @param data 
 * @returns 
 */
export const handleUserChallenge = async (data: any): Promise<string | null> => {
  if (!ls.sessionKey) return null

  const { iv, msg } = JSON.parse(data)

  // console.debug("msg: " + msg)
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
    challengeUser({ pin, afterChallenge: delegateAccount(audience) })
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

const delegateAccount = (audience: string): (challengeResponse: { userConfirmedPin: boolean }) => Promise<void> => {
  return async function ({ userConfirmedPin }) {
    if (!ls.sessionKey) return

    if (userConfirmedPin) {
      console.log("User confirmed, now let's delegate")
      const message = await auth.delegateAccount(audience)

      const iv = utils.randomBuf(16)
      const msg = await aes.encrypt(message, ls.sessionKey, { iv, alg: SymmAlg.AES_GCM })

      await publishOnChannel(
        JSON.stringify({
          iv: utils.arrBufToBase64(iv),
          msg
        })
      )
    }

    reportCompletion()
    resetLinkingState()
  }
}