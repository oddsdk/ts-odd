import expect from "expect"

import * as BaseAuth from "../../src/components/auth/implementation/base.js"

import { components } from "../helpers/components.js"
import { createConsumer } from "../../src/linking/consumer.js"
import { createProducer } from "../../src/linking/producer.js"
import { EventEmitter } from "../../src/common/event-emitter.js"

import type { Channel, ChannelData, ChannelOptions } from "../../src/components/auth/channel.js"


type MessageData = string | ArrayBufferLike | Blob | ArrayBufferView


/** Test implementation
 * The goal of test suite it to test the interaction between producers and consumers. Delegation
 * and the capablility to delegate are not tested.
 *
 * The tests use an event emitter to emulate a networked communication channel. Delegating an account
 * adds a username and a consumer DID to be linked to a list of producers. Linking an account adds a
 * username and consumer DID to a list of consumers.
 *
 * If all consumers are linked at the end of a test, the consumers and producers should be the same. Errors
 * or declined authorizations will set up different expectations.
 *
 */

describe("account linking", () => {
  let channel: EventEmitter<Record<string, ChannelData>> = new EventEmitter()
  let producerAccounts: Record<string, string[]> = {}
  let consumerAccounts: Record<string, string[]> = {}
  let dependencies = components

  before(() => {
    const createChannel = async (options: ChannelOptions): Promise<Channel> => {
      const { username, handleMessage } = options

      const messageCallback = (data: MessageData) => { handleMessage(new MessageEvent(`${username}`, { data })) }
      channel.on(`${username}`, messageCallback)

      return {
        send: (data) => channel.emit(`${username}`, data),
        close: () => channel.removeListener(`${username}`, messageCallback)
      }
    }

    const canDelegateAccount = async (username: string): Promise<boolean> => {
      return true
    }

    const delegateAccount = async (username: string, audience: string): Promise<Record<string, unknown>> => {
      producerAccounts[ username ] = producerAccounts[ username ] ?? []
      producerAccounts[ username ] = [ ...producerAccounts[ username ], audience ]

      return { username, audience }
    }

    const linkDevice = async (_username: string, data: Record<string, unknown>): Promise<void> => {
      const { username, audience } = data as Record<string, string>

      consumerAccounts[ username ] = consumerAccounts[ username ] ?? []
      consumerAccounts[ username ] = [ ...consumerAccounts[ username ], audience ]
    }

    const authComponent = {
      ...BaseAuth.implementation(components),

      createChannel,
      canDelegateAccount,
      delegateAccount,
      linkDevice,
    }

    dependencies = { ...components, auth: authComponent }
  })

  afterEach(() => {
    channel = new EventEmitter()
    producerAccounts = {}
    consumerAccounts = {}
  })

  it("links an account", async () => {
    let consumerDone = false

    const producer = await createProducer(dependencies, { username: "elm-owl" })

    producer.on("challenge", ({ confirmPin }) => {
      confirmPin()
    })

    const consumer = await createConsumer(dependencies, { username: "elm-owl" })

    consumer.on("done", () => {
      consumerDone = true
    })

    while (!consumerDone) await new Promise(r => setTimeout(r, 1000))
    producer.cancel()

    expect(consumerAccounts[ "elm-owl" ]).toBeDefined()
    expect(consumerAccounts[ "elm-owl" ].length).toEqual(1)
    expect(producerAccounts[ "elm-owl" ]).toBeDefined()
    expect(producerAccounts[ "elm-owl" ].length).toEqual(1)
    expect(consumerAccounts).toEqual(producerAccounts)
  })

  it("links when consumer starts first", async () => {
    let consumerDone = false

    const consumer = await createConsumer(dependencies, { username: "elm-owl" })

    consumer.on("done", () => {
      consumerDone = true
    })

    const producer = await createProducer(dependencies, { username: "elm-owl" })

    producer.on("challenge", ({ confirmPin }) => {
      confirmPin()
    })

    while (!consumerDone) await new Promise(r => setTimeout(r, 1000))
    producer.cancel()

    expect(consumerAccounts[ "elm-owl" ]).toBeDefined()
    expect(consumerAccounts[ "elm-owl" ].length).toEqual(1)
    expect(producerAccounts[ "elm-owl" ]).toBeDefined()
    expect(producerAccounts[ "elm-owl" ].length).toEqual(1)
    expect(consumerAccounts).toEqual(producerAccounts)
  })

  it("declines to link an account", async () => {
    let consumerDone = false

    const producer = await createProducer(dependencies, { username: "elm-owl" })

    producer.on("challenge", ({ rejectPin }) => {
      rejectPin()
    })

    const consumer = await createConsumer(dependencies, { username: "elm-owl" })

    consumer.on("done", () => {
      consumerDone = true
    })

    while (!consumerDone) await new Promise(r => setTimeout(r, 1000))
    producer.cancel()

    expect(consumerAccounts[ "elm-owl" ]).not.toBeDefined()
    expect(producerAccounts[ "elm-owl" ]).not.toBeDefined()
    expect(consumerAccounts).toEqual(producerAccounts)
  })


  // TODO: Run this test when we have implemented a message queue
  it.skip("links with one producer and multiple consumers", async () => {
    const numConsumers = Math.round(Math.random() * 2 + 2)
    const producer = await createProducer(dependencies, { username: "elm-owl" })

    producer.on("challenge", ({ confirmPin }) => {
      confirmPin()
    })

    const promisedConsumers = Array.from(Array(numConsumers)).map(async () => {
      const emitter = await createConsumer(dependencies, { username: "elm-owl" })
      const consumer = { emitter, done: false }

      consumer.emitter.on("done", () => {
        consumer.done = true
      })

      return consumer
    })

    const consumers = await Promise.all(promisedConsumers)

    while (!consumers.every(consumer => consumer.done)) await new Promise(r => setTimeout(r, 1000))
    producer.cancel()

    expect(consumerAccounts[ "elm-owl" ]).toBeDefined()
    expect(consumerAccounts[ "elm-owl" ].length).toEqual(numConsumers)
    expect(producerAccounts[ "elm-owl" ]).toBeDefined()
    expect(producerAccounts[ "elm-owl" ].length).toEqual(numConsumers)
    expect(consumerAccounts).toEqual(producerAccounts)
  })
})