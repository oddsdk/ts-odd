import type { AppInfo } from "../appInfo.js"
import type { CID } from "../common/cid.js"
import type { DistinctivePath, Partition } from "../path/index.js"
import type { Maybe } from "../common/types.js"
import type { Permissions } from "../permissions.js"
import type { Session } from "../session.js"
import type { ShortHands } from "../index.js"

import * as Events from "../events.js"
import { VERSION } from "../index.js"


// CREATE


type Config = {
  namespace: AppInfo | string
  session: Maybe<Session>
  capabilities?: Permissions
  shorthands: ShortHands
  lookupDataRoot: (username: string) => Promise<CID | null>
  eventEmitters: {
    fileSystem: Events.Emitter<Events.FileSystem>
    session: Events.Emitter<Events.Session>
  }
}

export async function create(config: Config): Promise<{
  connect: (extensionId: string) => void
  disconnect: (extensionId: string) => void
}> {
  let connection: Connection = { extensionId: null, connected: false }
  let listeners: Listeners

  return {
    connect: async (extensionId: string) => {
      connection = await connect(extensionId, config)

      // The extension may call connect more than once, but
      // listeners should only be added once
      if (!listeners) listeners = listen(connection, config)
    },
    disconnect: async (extensionId: string) => {
      connection = await disconnect(extensionId, config)
      stopListening(config, listeners)
    }
  }
}



// CONNECTION


type Connection = {
  extensionId: string | null
  connected: boolean
}

async function connect(extensionId: string, config: Config): Promise<Connection> {
  console.log("connect called with extension id", extensionId)

  const state = await getState(config)

  globalThis.postMessage({
    id: extensionId,
    type: "connect",
    timestamp: Date.now(),
    state
  })

  return { extensionId, connected: true }
}

async function disconnect(extensionId: string, config: Config): Promise<Connection> {
  console.log("disconnect called with extension id", extensionId)

  const state = await getState(config)

  globalThis.postMessage({
    id: extensionId,
    type: "disconnect",
    timestamp: Date.now(),
    state
  })

  return { extensionId, connected: false }
}



// LISTENERS


type Listeners = {
  handleLocalChange: (params: { root: CID; path: DistinctivePath<[ Partition, ...string[] ]> }) => Promise<void>
  handlePublish: (params: { root: CID }) => Promise<void>
  handleSessionCreate: (params: { session: Session }) => Promise<void>
  handleSessionDestroy: (params: { username: string }) => Promise<void>
}

function listen(connection: Connection, config: Config): Listeners {
  async function handleLocalChange(params: { root: CID; path: DistinctivePath<[ Partition, ...string[] ]> }) {
    const { root, path } = params
    const state = await getState(config)

    globalThis.postMessage({
      id: connection.extensionId,
      type: "filesystem",
      timestamp: Date.now(),
      state,
      detail: {
        type: "local-change",
        root: root.toString(),
        path
      }
    })
  }

  async function handlePublish(params: { root: CID }) {
    const { root } = params
    const state = await getState(config)

    globalThis.postMessage({
      id: connection.extensionId,
      type: "filesystem",
      timestamp: Date.now(),
      state,
      detail: {
        type: "publish",
        root: root.toString()
      }
    })
  }

  async function handleSessionCreate(params: { session: Session }) {
    const { session } = params

    config = { ...config, session }
    const state = await getState(config)

    globalThis.postMessage({
      id: connection.extensionId,
      type: "session",
      timestamp: Date.now(),
      state,
      detail: {
        type: "create",
        username: session.username
      }
    })
  }

  async function handleSessionDestroy(params: { username: string }) {
    console.log("sending destroy message from Webnative")

    const { username } = params

    config = { ...config, session: null }
    const state = await getState(config)

    globalThis.postMessage({
      id: connection.extensionId,
      type: "session",
      timestamp: Date.now(),
      state,
      detail: {
        type: "destroy",
        username
      }
    })
  }

  config.eventEmitters.fileSystem.on("local-change", handleLocalChange)
  config.eventEmitters.fileSystem.on("publish", handlePublish)
  config.eventEmitters.session.on("create", handleSessionCreate)
  config.eventEmitters.session.on("destroy", handleSessionDestroy)

  return { handleLocalChange, handlePublish, handleSessionCreate, handleSessionDestroy }
}

function stopListening(config: Config, listeners: Listeners) {
  if (listeners) {
    config.eventEmitters.fileSystem.removeListener("local-change", listeners.handleLocalChange)
    config.eventEmitters.fileSystem.removeListener("publish", listeners.handlePublish)
    config.eventEmitters.session.removeListener("create", listeners.handleSessionCreate)
    config.eventEmitters.session.removeListener("destroy", listeners.handleSessionDestroy)
  }
}



// STATE


type State = {
  app: {
    version: string
    namespace: AppInfo | string
    capabilities?: Permissions
  }
  filesystem: {
    dataRootCID: string | null
  }
  user: {
    username: string | null
    accountDID: string | null
    agentDID: string
  }
}

async function getState(config: Config): Promise<State> {
  const { capabilities, lookupDataRoot, namespace, session, shorthands } = config

  const agentDID = await shorthands.agentDID()
  let accountDID = null
  let username = null
  let dataRootCID = null

  if (session && session.username) {
    username = session.username
    accountDID = await shorthands.accountDID(username)
    dataRootCID = await lookupDataRoot(username)
  }

  return {
    app: {
      version: VERSION,
      namespace,
      capabilities
    },
    filesystem: {
      dataRootCID: dataRootCID?.toString() ?? null
    },
    user: {
      username,
      accountDID,
      agentDID,
    }
  }
}