import expect from "expect"

import { LOCAL_IMPLEMENTATION } from "../../src/auth/local.js"
import { createConsumer } from "../../src/auth/linking/consumer.js"
import { createProducer } from "../../src/auth/linking/producer.js"
import { EventEmitter } from "../../src/common/event-emitter.js"
import { setDependencies } from "../../src/setup.js"

import type { Channel, ChannelOptions } from "../../src/auth/channel.js"

type MessageData = string | ArrayBufferLike | Blob | ArrayBufferView

/** Test implementation
 * The goal of test suite it to test the interaction of producers and consumers. Delegation
 * and the capablility to delegate are not tested.
 * 
 * The tests use an event emitter to emulate a networked communication channel. Checking capabilities
 * adds a username to a list of producers. Delegating an account associates a consumer DID with username
 * in the list of producers. Linking an account adds a username and associated consumer DID to the list 
 * of consumers.
 * 
 * If all consumers are linked at the end of a test, the consumers and producers should be the same. Errors
 * or declined authorizations will set up different expectations.
 */

describe("account linking", () => {
  let channel: EventEmitter = new EventEmitter()
  let producers: Record<string, string[]> = {}
  let consumers: Record<string, string[]> = {}

  before(() => {
    const createChannel = async (options: ChannelOptions): Promise<Channel> => {
      const { username, handleMessage } = options

      const messageCallback = (data: MessageData) => { handleMessage(new MessageEvent(`${username}`, { data })) }
      channel.addEventListener(`${username}`, messageCallback)

      return {
        send: (data) => channel.dispatchEvent(`${username}`, data),
        close: () => channel.removeEventListener(`${username}`, messageCallback)
      }
    }

    const checkCapability = async (username: string): Promise<boolean> => {
      return true
    }

    const delegateAccount = async (username: string, audience: string): Promise<Record<string, unknown>> => {
      producers[username] = producers[username] ?? []
      producers[username] = [...producers[username], audience]

      return { username, audience }
    }

    const linkDevice = async (data: Record<string, unknown>): Promise<void> => {
      const { username, audience } = data as Record<string, string>

      consumers[username] = consumers[username] ?? []
      consumers[username] = [...consumers[username], audience]
    }


    setDependencies({
      ...LOCAL_IMPLEMENTATION,
      auth: {
        ...LOCAL_IMPLEMENTATION.auth,
        createChannel,
        checkCapability,
        delegateAccount,
        linkDevice
      }
    })
  })

  afterEach(() => {
    channel = new EventEmitter()
    producers = {}
    consumers = {}
  })

  it("links an account", async () => {
    const producer = await createProducer({ username: "elm-owl" })
    let producerDone = false

    producer.on("challenge", ({ confirmPin }) => {
      confirmPin()
    })

    producer.on("done", () => {
      producerDone = true
    })

    const consumer = await createConsumer({ username: "elm-owl" })
    let consumerDone = false

    consumer.on("done", () => {
      consumerDone = true
      producer.cancel()
    })

    while (!consumerDone || !producerDone) await new Promise(r => setTimeout(r, 1000))
    expect(consumers).toEqual(producers)
  })
})