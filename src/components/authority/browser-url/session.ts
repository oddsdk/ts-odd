import * as Events from "../../../events/authority.js"

import { Query } from "../../../authority/query.js"
import { Channel as ChannelType } from "../../../channel.js"
import { EventEmitter } from "../../../events/emitter.js"
import { INITIAL_NONCE, Msg, Step, StepResult, publicKeyFromDID } from "./common.js"

export abstract class Session {
  channel: ChannelType
  eventEmitter: EventEmitter<Events.Authority>
  ourDID: string
  ourPrivateKey: Uint8Array
  ourPublicKey: Uint8Array
  queries: Query[]
  remoteDID: string
  remotePublicKey: Uint8Array

  nonce: Uint8Array
  step: Step

  constructor(params: {
    channel: ChannelType
    eventEmitter: EventEmitter<Events.Authority>
    nonce?: Uint8Array
    ourDID: string
    ourPrivateKey: Uint8Array
    ourPublicKey: Uint8Array
    queries: Query[]
    remoteDID: string
  }) {
    this.channel = params.channel
    this.eventEmitter = params.eventEmitter
    this.ourDID = params.ourDID
    this.ourPrivateKey = params.ourPrivateKey
    this.ourPublicKey = params.ourPublicKey
    this.queries = params.queries
    this.remoteDID = params.remoteDID
    this.remotePublicKey = publicKeyFromDID(params.remoteDID)

    this.nonce = params.nonce || INITIAL_NONCE
    this.step = "handshake"
  }

  end: StepResult = {
    nextNonce: INITIAL_NONCE,
    nextStep: "fin",
  }

  ended() {
    return this.step === "fin"
  }

  // Steps

  async proceed(msg: Msg): Promise<void> {
    const result = await this.#proceed(msg)
    this.nonce = result.nextNonce
    this.step = result.nextStep
  }

  async #proceed(msg: Msg): Promise<StepResult> {
    if (msg.did === this.ourDID) {
      return this.earlyExit()
    }

    if (this.step !== msg.step) {
      return this.earlyExit(
        `Ignoring client ${msg.did}, steps don't match. Received '${msg.step}', but the active step is '${this.step}'.`
      )
    }

    if (this.remoteDID && msg.did !== this.remoteDID) {
      return this.earlyExit(
        `Ignoring client ${msg.did}, does not match DID in current state.`
      )
    }

    switch (this.step) {
      case "handshake":
        return this.handshake(msg)
      case "query":
        return this.query(msg)
      default:
        throw new Error(`Invalid step: ${this.step}`)
    }
  }

  abstract handshake(msg: Msg): Promise<StepResult>
  abstract query(msg: Msg): Promise<StepResult>

  // 🛠️

  sendMessage(step: Step, payload: string): void {
    this.channel.send(JSON.stringify({ step, did: this.ourDID, payload }))
  }

  // ⚠️

  earlyExit(...args: any): StepResult {
    if (args.length) console.warn(...args)
    return this.end
  }
}
