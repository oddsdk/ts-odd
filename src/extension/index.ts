import type { AppInfo, AuthenticationStrategy, CID, FileSystemShortHands, ShortHands, Session } from "../index.js"
import type { Maybe } from "../index.js"
import type { DistinctivePath, Partition } from "../path/index.js"
import * as Events from "../events.js"

import { VERSION } from "../index.js"


// CREATE


type Config = {
  auth: AuthenticationStrategy
  capabilities: { session: (username: string) => Promise<Maybe<Session>> }
  lookupDataRoot: (username: string) => Promise<CID | null>
  namespace: AppInfo | string
  session: Maybe<Session>
  shorthands: ShortHands & { fileSystem: FileSystemShortHands & Events.ListenTo<Events.FileSystem> }
}

export async function create(config: Config): Promise<{
  connect: (extensionId: string) => void
  disconnect: (extensionId: string) => void
}> {
  let connection: Connection = { extensionId: null, connected: false }
  let listeners: Listeners

  return {
    connect: async (extensionId: string) => {
      await connect(extensionId, config)
      connection = { extensionId, connected: true }

      listeners = listen(connection, config)
    },
    disconnect: async (extensionId: string) => {
      await disconnect(extensionId, config)
      connection = { extensionId, connected: false }

      stopListening(config, listeners)
    }
  }
}



// CONNECTION


type Connection = {
  extensionId: string | null
  connected: boolean
}

async function connect(extensionId: string, config: Config): Promise<void> {
  console.log("connect called with extension id", extensionId)

  const state = await getState(config)

  globalThis.postMessage({
    id: extensionId,
    type: "connect",
    state
  })
}

async function disconnect(extensionId: string, config: Config): Promise<void> {
  console.log("disconnect called with extension id", extensionId)

  const state = await getState(config)

  globalThis.postMessage({
    id: extensionId,
    type: "disconnect",
    state
  })
}



// LISTENERS


type Listeners = {
  handleLocalChange: (params: { root: CID; path: DistinctivePath<[ Partition, ...string[] ]> }) => Promise<void>
  handlePublish: (params: { root: CID }) => Promise<void>
}

function listen(connection: Connection, config: Config): Listeners {
  async function handleLocalChange(params: { root: CID; path: DistinctivePath<[ Partition, ...string[] ]> }) {
    const { root, path } = params
    const state = await getState(config)

    globalThis.postMessage({
      id: connection.extensionId,
      type: "filesystem",
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
      state,
      detail: {
        type: "publish",
        root: root.toString()
      }
    })
  }

  config.shorthands.fileSystem.on("local-change", handleLocalChange)
  config.shorthands.fileSystem.on("publish", handlePublish)

  return { handleLocalChange, handlePublish }
}

function stopListening(config: Config, listeners: Listeners) {
  if (listeners) {
    config.shorthands.fileSystem.removeListener("local-change", listeners.handleLocalChange)
    config.shorthands.fileSystem.removeListener("publish", listeners.handlePublish)
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
  const { lookupDataRoot, namespace, session, shorthands } = config

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