import type { AppInfo } from "../appInfo.js"
import type { CID } from "../common/cid.js"
import type { DistinctivePath, Partition } from "../path/index.js"

import { VERSION } from "../common/version.js"
import * as Events from "../events.js"

////////////
// CREATE //
////////////

export type Dependencies = Record<string, never> // TODO

type Config = {
  namespace: AppInfo | string
  capabilities?: Permissions
  dependencies: Dependencies
  eventEmitters: {
    fileSystem: Events.Emitter<Events.FileSystem>
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
    },
  }
}

////////////////
// CONNECTION //
////////////////

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
    state,
  })

  return { extensionId, connected: true }
}

async function disconnect(extensionId: string, config: Config): Promise<Connection> {
  const state = await getState(config)

  globalThis.postMessage({
    id: extensionId,
    type: "disconnect",
    timestamp: Date.now(),
    state,
  })

  return { extensionId, connected: false }
}

///////////////
// LISTENERS //
///////////////

type Listeners = {
  handleLocalChange: (params: { dataRoot: CID; path: DistinctivePath<[Partition, ...string[]]> }) => Promise<void>
  handlePublish: (params: { dataRoot: CID }) => Promise<void>
}

function listen(connection: Connection, config: Config): Listeners {
  async function handleLocalChange(params: { dataRoot: CID; path: DistinctivePath<[Partition, ...string[]]> }) {
    const { dataRoot, path } = params
    const state = await getState(config)

    globalThis.postMessage({
      id: connection.extensionId,
      type: "fileSystem",
      timestamp: Date.now(),
      state,
      detail: {
        type: "local-change",
        root: dataRoot.toString(),
        path,
      },
    })
  }

  async function handlePublish(params: { dataRoot: CID }) {
    const { dataRoot } = params
    const state = await getState(config)

    globalThis.postMessage({
      id: connection.extensionId,
      type: "fileSystem",
      timestamp: Date.now(),
      state,
      detail: {
        type: "publish",
        root: dataRoot.toString(),
      },
    })
  }

  config.eventEmitters.fileSystem.on("local-change", handleLocalChange)
  config.eventEmitters.fileSystem.on("publish", handlePublish)

  return { handleLocalChange, handlePublish }
}

function stopListening(config: Config, listeners: Listeners) {
  if (listeners) {
    config.eventEmitters.fileSystem.removeListener("local-change", listeners.handleLocalChange)
    config.eventEmitters.fileSystem.removeListener("publish", listeners.handlePublish)
  }
}

///////////
// STATE //
///////////

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
  }
  odd: {
    version: string
  }
}

async function getState(config: Config): Promise<State> {
  const { capabilities, dependencies, namespace } = config

  const accountDID = null
  const username = null
  const dataRootCID = null

  // TODO:
  // if (session && session.username) {
  //   username = session.username
  //   accountDID = await dependencies.reference.didRoot.lookup(username)
  //   dataRootCID = await dependencies.reference.dataRoot.lookup(username)
  // }

  return {
    app: {
      namespace,
      ...(capabilities ? { capabilities } : {}),
    },
    fileSystem: {
      dataRootCID: null, // TODO: dataRootCID?.toString() ?? null
    },
    user: {
      username,
      accountDID,
    },
    odd: {
      version: VERSION,
    },
  }
}
