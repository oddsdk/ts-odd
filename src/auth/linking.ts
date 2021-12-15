import aes from "keystore-idb/lib/aes/index.js"
import config from "keystore-idb/lib/config.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg } from "keystore-idb/lib/types.js"
import * as did from "../did/index.js"
import * as ucan from "../ucan/index.js"
import { publishOnChannel } from "./index.js"

type LinkingState = {
  sessionKey: CryptoKey | null
  temporaryRsaPair: CryptoKeyPair | null
}

const ls: LinkingState = {
  sessionKey: null,
  temporaryRsaPair: null,
}

const resetLinkingState = () => {
  ls.sessionKey = null
  ls.temporaryRsaPair = null
}

// 🔗 Device Linking Steps 

export const sendTemporaryExchangeKey = async (): Promise<void> => {
  const cfg = config.normalize()

  const { rsaSize, hashAlg } = cfg
  ls.temporaryRsaPair = await rsa.makeKeypair(rsaSize, hashAlg, KeyUse.Exchange)
  const pubKey = await rsa.getPublicKey(ls.temporaryRsaPair)
  const temporaryDID = did.publicKeyToDid(pubKey, did.KeyType.RSA)
  await publishOnChannel(temporaryDID)
}

export const sendSessionKey = async (didThrowaway: string): Promise<void> => {
  ls.sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM })
  const cfg = config.normalize()
  const { hashAlg } = cfg

  const sessionKey = await aes.exportKey(ls.sessionKey)
  const { publicKey } = did.didToPublicKey(didThrowaway)
  const publicCryptoKey = await rsa.importPublicKey(publicKey, hashAlg, KeyUse.Exchange)
  const encryptedSessionKey = await aes.encrypt(sessionKey, publicCryptoKey)

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
      sessionKey: encryptedSessionKey
    })
  )
}

export const sendUserChallenge = async (pin: string): Promise<void> => {
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
}
