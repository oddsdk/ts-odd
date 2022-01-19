import aes from "keystore-idb/lib/aes/index.js"
import config from "keystore-idb/lib/config.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg } from "keystore-idb/lib/types.js"
import * as did from "../../did/index.js"
import * as ucan from "../../ucan/index.js"
import * as storage from "../../storage/index.js"
import { setLinkingRole } from "../linking/switch.js"
import { publishOnChannel } from "../index.js"
import * as auth from "../index.js"

type LinkingStep = "BROADCAST" | "NEGOTIATION" | "DELEGATION"

type LinkingState = {
  username: string | null
  sessionKey: CryptoKey | null
  temporaryRsaPair: CryptoKeyPair | null
  step: LinkingStep | null
}

export type PinCallback = (challenge: { pin: number[] }) => void

let challengeUser: PinCallback
let reportCompletion: (username: string | null) => void

const ls: LinkingState = {
  username: null,
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

export const startLinkingConsumer = async (
  config: {
    username: string
    onChallenge: PinCallback
    onCompletion: (username: string | null) => void
  }
): Promise<null> => {
  setLinkingRole("CONSUMER")
  ls.step = "BROADCAST"
  ls.username = config.username
  challengeUser = config.onChallenge
  reportCompletion = config.onCompletion
  await auth.openChannel(config.username)
  await sendTemporaryExchangeKey()
  return null
}

export const handleMessage = async (message: string): Promise<void> => {
  console.debug("Linking Status", ls)

  if (ls.step === "NEGOTIATION") {
    const pin = await handleSessionKey(message)
    if (pin) {
      await sendUserChallenge(pin)
      challengeUser({ pin: Array.from(pin) })
    }
  } else if (ls.step === "DELEGATION") {
    await linkDevice(message)
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
 *  NEGOTIATION
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
 * NEGOTIATION (response)
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
  const delegation = JSON.parse(message)

  await storage.setItem("webnative.auth_username", ls.username)
  await auth.linkDevice(delegation)
  reportCompletion(ls.username)
  resetLinkingState()
  await auth.closeChannel()

  return
}