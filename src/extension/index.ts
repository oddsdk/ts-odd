import type { AppInfo } from "../appInfo.js"
import type { CID } from "../common/cid.js"
import type { Crypto, Reference } from "../components.js"
import type { DistinctivePath, Partition } from "../path/index.js"
import type { Maybe } from "../common/types.js"
import type { Permissions } from "../permissions.js"
import type { Session } from "../session.js"

import * as DID from "../did/index.js"
import * as Events from "../events.js"
import { VERSION } from "../index.js"


// CREATE

export type Dependencies = {
  crypto: Crypto.Implementation
  reference: Reference.Implementation
}

type Config = {
  namespace: AppInfo | string
  session: Maybe<Session>
  capabilities?: Permissions
  dependencies: Dependencies
  eventEmitters: {
    fileSystem: Events.Emitter<Events.FileSystem>
    session: Events.Emitter<Events.Session<Session>>
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
      type: "fileSystem",
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
      type: "fileSystem",
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

  config.eventEmitters.fileSystem.on("fileSystem:local-change", handleLocalChange)
  config.eventEmitters.fileSystem.on("fileSystem:publish", handlePublish)
  config.eventEmitters.session.on("session:create", handleSessionCreate)
  config.eventEmitters.session.on("session:destroy", handleSessionDestroy)

  return { handleLocalChange, handlePublish, handleSessionCreate, handleSessionDestroy }
}

function stopListening(config: Config, listeners: Listeners) {
  if (listeners) {
    config.eventEmitters.fileSystem.removeListener("fileSystem:local-change", listeners.handleLocalChange)
    config.eventEmitters.fileSystem.removeListener("fileSystem:publish", listeners.handlePublish)
    config.eventEmitters.session.removeListener("session:create", listeners.handleSessionCreate)
    config.eventEmitters.session.removeListener("session:destroy", listeners.handleSessionDestroy)
  }
}



// STATE


type State = {
  app: {
    namespace: AppInfo | string
    capabilities?: Permissions
  }
  fileSystem: {
    dataRootCID: string | null
  }
  user: {
    username: string | null
    accountDID: string | null
    agentDID: string
  }
  odd: {
    version: string
  }
}

async function getState(config: Config): Promise<State> {
  const { capabilities, dependencies, namespace, session } = config

  const agentDID = await DID.agent(dependencies.crypto)
  let accountDID = null
  let username = null
  let dataRootCID = null

  if (session && session.username) {
    username = session.username
    accountDID = await dependencies.reference.didRoot.lookup(username)
    dataRootCID = await dependencies.reference.dataRoot.lookup(username)
  }

  return {
    app: {
      namespace,
      ...(capabilities ? { capabilities } : {})
    },
    fileSystem: {
      dataRootCID: dataRootCID?.toString() ?? null
    },
    user: {
      username,
      accountDID,
      agentDID
    },
    odd: {
      version: VERSION
    }
  }
}