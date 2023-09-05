import * as Uint8Arrays from "uint8arrays"

import { x25519 } from "@noble/curves/ed25519"
import { randomBytes } from "iso-base/crypto"
import { tag } from "iso-base/varint"
import { base58btc } from "multiformats/bases/base58"

import * as Query from "../../../authority/query.js"
import * as Events from "../../../events/authority.js"
import * as Path from "../../../path/index.js"
import * as Tickets from "../../../ticket/index.js"
import * as Ucan from "../../../ucan/ts-ucan/index.js"
import * as Account from "../../account/implementation.js"
import * as Channel from "../../channel/implementation.js"
import * as Identifier from "../../identifier/implementation.js"

import { AccessKeyWithContext } from "../../../accessKey.js"
import { Channel as ChannelType } from "../../../channel.js"
import { isObject, isString } from "../../../common/type-checks.js"
import { EventEmitter } from "../../../events/emitter.js"
import { Inventory } from "../../../inventory.js"
import { Names } from "../../../repositories/names.js"
import { Ticket } from "../../../ticket/types.js"
import {
  CIPHER_TEXT_ENCODING,
  Cipher,
  Msg,
  ProvideResponse,
  StepResult,
  decodeChannelData,
  decryptJSONPayload,
  decryptPayload,
  encryptJSONPayload,
  makeCipher,
} from "./common.js"
import { Session } from "./session.js"

export type ProvideParams<AccountAnnex extends Account.AnnexParentType> = {
  dependencies: {
    account: Account.Implementation<AccountAnnex>
    channel: Channel.Implementation
    identifier: Identifier.Implementation
  }
  eventEmitter: EventEmitter<Events.Authority>
  inventory: Inventory
  queries: Query.Query[]
  names: Names
}

export async function provide<AccountAnnex extends Account.AnnexParentType>(
  params: ProvideParams<AccountAnnex>
): Promise<ProvideResponse> {
  const challenge = randomBytes(16)

  const privateKey = x25519.utils.randomPrivateKey()
  const publicKey = x25519.getPublicKey(privateKey)

  const id = base58btc.encode(tag(0xec, publicKey))
  const did = `did:key:${id}`

  const sessionsCache = {}

  params.dependencies.channel.establish({
    topic: did,
    onmessage: (event: MessageEvent, channel: ChannelType) =>
      messageHandler({
        ...params,
        challenge,
        channel,
        event,
        ourDID: did,
        ourPrivateKey: privateKey,
        ourPublicKey: publicKey,
        sessionsCache,
      }),
  })

  // URL
  const url = new URL(location.href)
  url.searchParams.set("authority[challenge]", Uint8Arrays.toString(challenge, CIPHER_TEXT_ENCODING))
  url.searchParams.set("authority[publicKey]", Uint8Arrays.toString(publicKey, CIPHER_TEXT_ENCODING))

  return {
    url: url.toString(),
  }
}

//////////////
// MESSAGES //
//////////////

type MessageHandlerParams<AccountAnnex extends Account.AnnexParentType> = ProvideParams<AccountAnnex> & {
  challenge: Uint8Array
  channel: ChannelType
  event: MessageEvent
  ourDID: string
  ourPrivateKey: Uint8Array
  ourPublicKey: Uint8Array
  sessionsCache: Record<string, ProviderSession<AccountAnnex>>
}

async function messageHandler<AccountAnnex extends Account.AnnexParentType>(
  params: MessageHandlerParams<AccountAnnex>
) {
  const msg = await decodeChannelData(params.event.data)
  if (!msg) return

  const sessionsCache = params.sessionsCache
  const sessionFromCache = sessionsCache[msg.did]
  const session = sessionFromCache ? sessionFromCache : new ProviderSession({
    ...params,
    remoteDID: msg.did,
  })

  sessionsCache[msg.did] = session
  await session.proceed(msg)

  if (session.ended()) {
    delete sessionsCache[msg.did]
  }
}

/////////////
// SESSION //
/////////////

class ProviderSession<AccountAnnex extends Account.AnnexParentType> extends Session {
  challenge: Uint8Array
  dependencies: MessageHandlerParams<AccountAnnex>["dependencies"]
  inventory: Inventory
  names: Names

  constructor(
    params: MessageHandlerParams<AccountAnnex> & {
      remoteDID: string
    }
  ) {
    super(params)

    this.challenge = params.challenge
    this.dependencies = params.dependencies
    this.inventory = params.inventory
    this.names = params.names
  }

  ////////////////////////
  // STEP 1 - HANDSHAKE //
  ////////////////////////

  async handshake(msg: Msg): Promise<StepResult> {
    let decryption = makeCipher({
      nonce: this.nonce,
      producerPublicKey: this.ourPublicKey,
      ourPrivateKey: this.ourPrivateKey,
      remotePublicKey: this.remotePublicKey,
    })

    const payload = decryptPayload(decryption.cipher, msg.payload)

    const hasCorrectChallenge = Uint8Arrays.equals(
      payload,
      this.challenge
    )

    if (!hasCorrectChallenge) {
      return this.earlyExit(`Challenge failed during handshake with ${msg.did}`)
    }

    let { cipher, nextNonce } = makeCipher({
      nonce: decryption.nextNonce,
      producerPublicKey: this.ourPublicKey,
      ourPrivateKey: this.ourPrivateKey,
      remotePublicKey: this.remotePublicKey,
    })

    this.sendMessage(
      "handshake",
      encryptJSONPayload(cipher, { approved: true })
    )

    return { nextNonce, nextStep: "query" }
  }

  ////////////////////
  // STEP 2 - QUERY //
  ////////////////////

  async query(msg: Msg): Promise<StepResult> {
    let decryption = makeCipher({
      nonce: this.nonce,
      producerPublicKey: this.ourPublicKey,
      ourPrivateKey: this.ourPrivateKey,
      remotePublicKey: this.remotePublicKey,
    })

    const payload = decryptJSONPayload(decryption.cipher, msg.payload)

    if (
      !isObject(payload)
      || !Array.isArray(payload.queries)
      || !payload.queries.every((p: unknown) => isString(p) || isObject(p))
      || !isString(payload.identifier)
    ) {
      return this.earlyExit(`Ignoring queries from ${msg.did}, improperly encoded queries.`)
    }

    const remoteIdentifierDID = payload.identifier

    console.log(payload)

    const queries = payload.queries.map(Query.fromJSON)
    const allContained = queries.every(child => {
      return queries.some(parent => Query.isContained({ parent, child }))
    })

    if (!allContained) {
      return this.earlyExit(`Ignoring queries from ${msg.did}, asking for more than was provided.`)
    }

    return new Promise((resolve, reject) => {
      let { cipher, nextNonce } = makeCipher({
        nonce: decryption.nextNonce,
        producerPublicKey: this.ourPublicKey,
        ourPrivateKey: this.ourPrivateKey,
        remotePublicKey: this.remotePublicKey,
      })

      this.eventEmitter.emit("provide:query", {
        approve: (queries) => {
          this
            .approveQueries(queries, remoteIdentifierDID, cipher)
            .then(() => resolve(this.end), reject)
        },
        dismiss: () => {
          this
            .dismissQueries(cipher)
            .then(() => resolve(this.end), reject)
        },
        queries,
      })
    })
  }

  async approveQueries(
    queries: Query.Query[],
    remoteIdentifierDID: string,
    cipher: Cipher
  ): Promise<void> {
    if (queries.length === 0) throw new Error("Cannot approve an empty list of queries.")

    const identifierDID = await this.dependencies.identifier.did()
    const identifierKeyPair = {
      did: () => identifierDID,
      jwtAlg: await this.dependencies.identifier.ucanAlgorithm(),
      sign: this.dependencies.identifier.sign,
    }

    const resolvedNames: Record<string, string> = {}

    const fsQueries = queries.reduce(
      (acc, q) => q.query === "fileSystem" ? [...acc, q] : acc,
      [] as Query.FileSystemQuery[]
    )

    const accountTicketPromises = queries
      .reduce(
        (acc, q) => q.query === "account" ? [...acc, q] : acc,
        [] as Query.AccountQuery[]
      )
      .map(async q => {
        const tickets = await this.dependencies.account.provideAuthority(
          q,
          this.dependencies.identifier,
          this.inventory
        )

        const promises = tickets.map(async t => {
          const ucan = await Ucan.build({
            audience: remoteIdentifierDID,
            issuer: identifierKeyPair,
            proofs: [(await Tickets.cid(t)).toString()],
          })

          const ticket = Ucan.toTicket(ucan)

          return this.inventory.bundleTickets(
            ticket,
            Ucan.ticketProofResolver
          )
        })

        const nested = await Promise.all(promises)
        const collectedTickets = nested.flat()

        return {
          query: q,
          tickets: collectedTickets,
        }
      })

    const accountTicketsBundles = await Promise.all(accountTicketPromises)
    const accountTickets = accountTicketsBundles

    const fileSystemTicketPromises = fsQueries
      .map(query => {
        const did = this.names.resolveId(query.id)
        if (!did) return []

        if ("name" in query.id) {
          resolvedNames[query.id.name] = did
        }

        const ticket = this.inventory.lookupFileSystemTicket(query.path, did)
        if (!ticket) return []

        return [{ ticket, query }]
      })
      .flat()
      .map(async item => {
        const ucan = await Ucan.build({
          audience: remoteIdentifierDID,
          issuer: identifierKeyPair,
          proofs: [(await Tickets.cid(item.ticket)).toString()],
        })

        const ticket = Ucan.toTicket(ucan)
        const tickets = this.inventory.bundleTickets(
          ticket,
          Ucan.ticketProofResolver
        )

        return { query: item.query, tickets }
      })

    const fileSystemTicketBundles = await Promise.all(fileSystemTicketPromises)
    const fileSystemTickets = fileSystemTicketBundles

    const accessKeys = fsQueries
      .filter(q => Path.isPartition("private", q.path))
      .map(q => {
        const did = this.names.resolveId(q.id)
        if (!did) return []
        const key = this.inventory.findAccessKey(q.path, did)
        if (!key) return []
        return [{ query: q, key }]
      })
      .flat()

    this.sendMessage(
      "query",
      encryptJSONPayload(cipher, {
        accountTickets,
        fileSystemTickets,
        accessKeys: accessKeys.map(a => {
          return {
            did: a.key.did,
            key: Uint8Arrays.toString(a.key.key, CIPHER_TEXT_ENCODING),
            query: a.query,
            path: Path.toPosix(a.key.path),
          }
        }),
        resolvedNames,
      })
    )

    this.eventEmitter.emit("provide:authorised", { queries })
    this.eventEmitter.emit("provide:authorized", { queries })
  }

  async dismissQueries(cipher: Cipher): Promise<void> {
    this.sendMessage(
      "query",
      encryptJSONPayload(cipher, { dismissed: true })
    )

    this.eventEmitter.emit("provide:dismissed")
  }
}
