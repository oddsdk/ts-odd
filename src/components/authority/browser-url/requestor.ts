import * as Uint8Arrays from "uint8arrays"

import { x25519 } from "@noble/curves/ed25519"
import { tag } from "iso-base/varint"
import { base58btc } from "multiformats/bases/base58"

import * as Query from "../../../authority/query.js"
import * as Events from "../../../events/authority.js"
import * as Path from "../../../path/index.js"
import * as Channel from "../../channel/implementation.js"
import * as Identifier from "../../identifier/implementation.js"

import { Channel as ChannelType } from "../../../channel.js"
import { isObject, isString } from "../../../common/type-checks.js"
import { EventEmitter } from "../../../events/emitter.js"
import { Ticket } from "../../../index.js"
import { isTicket } from "../../../ticket/index.js"
import { AuthorityArtefacts, RequestOptions } from "../implementation.js"
import {
  CIPHER_TEXT_ENCODING,
  INITIAL_NONCE,
  Msg,
  RequestResponse,
  StepResult,
  decodeChannelData,
  decryptJSONPayload,
  encryptJSONPayload,
  encryptPayload,
  makeCipher,
} from "./common.js"
import { Session } from "./session.js"

export type RequestParams = {
  dependencies: {
    channel: Channel.Implementation
    identifier: Identifier.Implementation
  }
  eventEmitter: EventEmitter<Events.Authority>
  options: RequestOptions
  queries: Query.Query[]
}

export async function request(
  params: RequestParams
): Promise<AuthorityArtefacts<RequestResponse> | null> {
  const url = new URL(location.href)
  const challenge = url.searchParams.get("authority[challenge]")
  const otherPubKeyString = url.searchParams.get("authority[publicKey]")

  // Nothing to do
  if (!challenge || !otherPubKeyString) return null

  // Crypto
  const privateKey = x25519.utils.randomPrivateKey()
  const publicKey = x25519.getPublicKey(privateKey)

  const ourDID = `did:key:${base58btc.encode(tag(0xec, publicKey))}`
  const otherPubKey = Uint8Arrays.fromString(otherPubKeyString, CIPHER_TEXT_ENCODING)

  const handshakeCipher = makeCipher({
    nonce: INITIAL_NONCE,
    producerPublicKey: otherPubKey,
    ourPrivateKey: privateKey,
    remotePublicKey: otherPubKey,
  })

  // Timeout after 60 seconds
  return new Promise((resolve, reject) => {
    let timeoutId: number = 0
    let channel: ChannelType

    function setTimer() {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        channel.close()
        reject(
          "Authority exchange timed out. The URL parameters could be out of date, or the provider has started a new session. Each time `.provide()` is called a new session is started, make sure you're using the correct URL or QR code."
        )
      }, 60000) as unknown as number
      return timeoutId
    }

    // Setup channel
    const topicID = base58btc.encode(tag(0xec, otherPubKey))
    const topicDID = `did:key:${topicID}`

    const sessionsCache = {}

    params.dependencies.channel.establish({
      topic: topicDID,
      onmessage: (event: MessageEvent, channel: ChannelType) =>
        messageHandler({
          ...params,
          channel,
          event,
          nonce: handshakeCipher.nextNonce,
          ourDID,
          ourPrivateKey: privateKey,
          ourPublicKey: publicKey,
          resolve,
          sessionsCache,
          resetTimeout: setTimer,
        }),
    }).then(c => {
      channel = c

      // Send handshake message
      channel.send(
        JSON.stringify({
          step: "handshake",
          did: ourDID,
          payload: encryptPayload(
            handshakeCipher.cipher,
            Uint8Arrays.fromString(challenge, CIPHER_TEXT_ENCODING)
          ),
        })
      )

      setTimer()
    })
  })
}

//////////////
// MESSAGES //
//////////////

type MessageHandlerParams = RequestParams & {
  channel: ChannelType
  event: MessageEvent
  nonce: Uint8Array
  ourDID: string
  ourPrivateKey: Uint8Array
  ourPublicKey: Uint8Array
  resolve: (value: AuthorityArtefacts<RequestResponse> | null) => void
  sessionsCache: Record<string, RequestorSession>
  resetTimeout: () => number
}

async function messageHandler(params: MessageHandlerParams) {
  const msg = await decodeChannelData(params.event.data)
  if (!msg) return

  const timeoutId = params.resetTimeout()

  const sessionsCache = params.sessionsCache
  const sessionFromCache = sessionsCache[msg.did]
  const session = sessionFromCache ? sessionFromCache : new RequestorSession({
    ...params,
    remoteDID: msg.did,
  })

  sessionsCache[msg.did] = session
  await session.proceed(msg)

  if (session.ended()) {
    delete sessionsCache[msg.did]
    params.channel.close()
    clearTimeout(timeoutId)
    params.resolve(null)
  }
}

/////////////
// SESSION //
/////////////

class RequestorSession extends Session {
  dependencies: MessageHandlerParams["dependencies"]
  resolve: MessageHandlerParams["resolve"]

  constructor(
    params: MessageHandlerParams & {
      remoteDID: string
    }
  ) {
    super(params)

    this.dependencies = params.dependencies
    this.resolve = params.resolve
  }

  ////////////////////////
  // STEP 1 - HANDSHAKE //
  ////////////////////////

  async handshake(msg: Msg): Promise<StepResult> {
    let decryption = makeCipher({
      nonce: this.nonce,
      producerPublicKey: this.remotePublicKey,
      ourPrivateKey: this.ourPrivateKey,
      remotePublicKey: this.remotePublicKey,
    })

    const payload = decryptJSONPayload(decryption.cipher, msg.payload)

    if (payload.approved !== true) {
      return this.earlyExit(`Cancelling authority request, producer did not accept.`)
    }

    let { cipher, nextNonce } = makeCipher({
      nonce: decryption.nextNonce,
      producerPublicKey: this.remotePublicKey,
      ourPrivateKey: this.ourPrivateKey,
      remotePublicKey: this.remotePublicKey,
    })

    this.sendMessage(
      "query",
      encryptJSONPayload(cipher, {
        identifier: this.dependencies.identifier.did(),
        queries: this.queries.map(Query.toJSON),
      })
    )

    return { nextNonce, nextStep: "query" }
  }

  ////////////////////
  // STEP 2 - QUERY //
  ////////////////////

  async query(msg: Msg): Promise<StepResult> {
    let decryption = makeCipher({
      nonce: this.nonce,
      producerPublicKey: this.remotePublicKey,
      ourPrivateKey: this.ourPrivateKey,
      remotePublicKey: this.remotePublicKey,
    })

    const payload = decryptJSONPayload(decryption.cipher, msg.payload)

    if (payload.dismissed === true) {
      this.eventEmitter.emit("request:dismissed")
      return this.end
    }

    if (
      !isObject(payload)
      || !Array.isArray(payload.accessKeys)
      || !Array.isArray(payload.accountTickets)
      || !Array.isArray(payload.fileSystemTickets)
      || !payload.accessKeys.every((p: unknown) =>
        isObject(p) && isString(p.did) && isObject(p.query) && isString(p.key) && isString(p.path)
      )
      || !payload.accountTickets.every((p: unknown) => isObject(p) && isObject(p.query) && Array.isArray(p.tickets))
      || !payload.fileSystemTickets.every((p: unknown) => isObject(p) && isObject(p.query) && Array.isArray(p.tickets))
      || !isObject(payload.resolvedNames)
      || !Object.values(payload.resolvedNames).every((s: unknown) => isString(s))
    ) {
      return this.earlyExit(`Ignoring queries from ${msg.did}, improperly encoded query approvals.`, payload)
    }

    let authorisedQueries: Query.Query[] = []

    const accountTickets = payload.accountTickets.map(i => {
      const query = Query.fromJSON(i.query)
      authorisedQueries.push(query)
      const tickets: Ticket[] = i.tickets.reduce(
        (acc: Ticket[], t: unknown) => isTicket(t) ? [...acc, t] : acc,
        []
      )

      return { query, tickets }
    })

    const fileSystemTickets = payload.fileSystemTickets.map(i => {
      const query = Query.fromJSON(i.query)
      authorisedQueries.push(query)
      const tickets: Ticket[] = i.tickets.reduce(
        (acc: Ticket[], t: unknown) => isTicket(t) ? [...acc, t] : acc,
        []
      )

      return { query, tickets }
    })

    const accessKeys = payload.accessKeys.map(a => {
      return {
        did: a.did,
        key: Uint8Arrays.fromString(a.key, CIPHER_TEXT_ENCODING),
        query: Query.fromJSON(a.query),
        path: Path.fromPosix(a.path),
      }
    })

    this.resolve({
      accessKeys,
      accountTickets,
      fileSystemTickets,
      authorisedQueries,
      resolvedNames: payload.resolvedNames as Record<string, string>,
      requestResponse: {},
    })

    return this.end
  }
}
