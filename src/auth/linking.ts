import aes from "keystore-idb/lib/aes/index.js"
import config from "keystore-idb/lib/config.js"
import rsa from "keystore-idb/lib/rsa/index.js"
import utils from "keystore-idb/lib/utils.js"
import { KeyUse, SymmAlg } from "keystore-idb/lib/types.js"
import * as did from "../did/index.js"
import { setup } from "../setup/internal.js"
import * as storage from "../storage/index.js"
import * as ucan from "../ucan/index.js"

type ChannelState = {
  sessionKey: CryptoKey | null
  socket: WebSocket | null
  temporaryRsaPair: CryptoKeyPair | null
  topic: string
}

const cs: ChannelState = {
  sessionKey: null,
  socket: null,
  temporaryRsaPair: null,
  topic: ""
}

const resetChannelState = (): void => {
  cs.sessionKey = null
  cs.topic = ""
}

export const openWssChannel = async (maybeUsername: string, handleMessage: (this: WebSocket, ev: MessageEvent) => any): Promise<void> => {
  resetChannelState()

  const rootDid = await lookupRootDid(maybeUsername).catch(_ => null)
  if (!rootDid) {
    return
  }

  const apiEndpoint = setup.getApiEndpoint()
  const endpoint = apiEndpoint.replace(/^https?:\/\//, "wss://")
  const topic = `deviceLink#${rootDid}`
  console.log("Opening channel", topic)
  cs.topic = topic
  cs.socket = new WebSocket(`${endpoint}/user/link/${rootDid}`)
  cs.socket.onmessage = handleMessage
}

export const closeWssChannel = async (): Promise<void> => {
  console.log("Closing channel")
  if (cs.socket) {
    cs.socket.close(1000)
  }

  resetChannelState()
}

export const handleMessage = (ev: MessageEvent): any => {
  console.log(ev)
  return null
}

export const publishOnChannel = (data: any): void => {
  const binary = typeof data === "string"
    ? new TextEncoder().encode(data).buffer
    : data
  
    cs.socket?.send(binary)
}

// 🔗 Device Linking Steps 

export const sendTemporaryExchangeKey = async (): Promise<void> => {
  const cfg = config.normalize()

  const { rsaSize, hashAlg } = cfg
  cs.temporaryRsaPair = await rsa.makeKeypair(rsaSize, hashAlg, KeyUse.Exchange)
  const pubKey = await rsa.getPublicKey(cs.temporaryRsaPair)
  const temporaryDID = did.publicKeyToDid(pubKey, did.KeyType.RSA)
  publishOnChannel(temporaryDID)

}

export const sendSessionKey = async (didThrowaway: string): Promise<void> => {
  cs.sessionKey = await aes.makeKey({ alg: SymmAlg.AES_GCM })
  const cfg = config.normalize()
  const { hashAlg } = cfg

  const sessionKey = await aes.exportKey(cs.sessionKey)
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
  const msg = await aes.encrypt(ucan.encode(u), cs.sessionKey, { iv, alg: SymmAlg.AES_GCM })

  publishOnChannel(
    JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg,
      sessionKey: encryptedSessionKey
    })
  )
}

export const sendUserChallenge = async (pin: string): Promise<void> => {
  if (!cs.sessionKey) return
  
  const iv = utils.randomBuf(16)
  const msg = await aes.encrypt(JSON.stringify({
    did: await did.ucan(),
    pin
  }), cs.sessionKey, { iv, alg: SymmAlg.AES_GCM })

  publishOnChannel(
    JSON.stringify({
      iv: utils.arrBufToBase64(iv),
      msg
    })
  )
}

// ⛑ Helpers

const rootDidCache: Record<string, string> = {}

const lookupRootDid = async (maybeUsername: string | null) => {
  let x, y

  const maybeUcan: string | null = await storage.getItem("ucan")
  if (maybeUsername) {
    x = maybeUsername
    y = rootDidCache[x] || (await did.root(x))
  } else if (maybeUcan) {
    x = "ucan"
    y = rootDidCache[x] || ucan.rootIssuer(maybeUcan)
  } else {
    x = "local"
    y = rootDidCache[x] || (await did.write())
  }
  return y
}
