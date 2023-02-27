import type { AppInfo, AuthenticationStrategy, CID, FileSystemShortHands, ShortHands, Session } from "../index.js"
import type { Maybe } from "../index.js"
import * as Events from "../events.js"

import { VERSION } from "../index.js"

type Connection = {
  extensionId: string | null
  connected: boolean
}

type Config = {
  auth: AuthenticationStrategy
  capabilities: { session: (username: string) => Promise<Maybe<Session>> }
  lookupDataRoot: (username: string) => Promise<CID | null>
  namespace: AppInfo | string
  session: Maybe<Session>
  shorthands: ShortHands & { fileSystem: FileSystemShortHands & Events.ListenTo<Events.FileSystem> }
}

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

export async function create(config: Config): Promise<{
  connect: (extensionId: string) => void
  disconnect: (extensionId: string) => void
}> {
  let connection: Connection = { extensionId: null, connected: false }

  return {
    connect: async (extensionId: string) => {
      connect(extensionId)
      connection = { extensionId, connected: true }

      const state = await getState(config)
      sendData(connection, state)

      listen(connection, config)
    },
    disconnect: (extensionId: string) => {
      disconnect(extensionId)
      connection = { extensionId, connected: false }
    }
  }
}

function sendData(connection: Connection, state: State) {
  if (connection.connected) {
    globalThis.postMessage({
      id: connection.extensionId,
      type: "data",
      data: state
    })
  }
}

function listen(connection: Connection, config: Config) {
  const { shorthands } = config

  shorthands.fileSystem.on("local-change", async ({ root, path }) => {
    const state = await getState(config)

    globalThis.postMessage({
      id: connection.extensionId,
      type: "data",
      data: {
        info: state,
        type: "local-change",
        root: root.toString(),
        path
      }
    })

  })


}

function connect(extensionId: string): void {
  console.log("connect called with extension id", extensionId)

  globalThis.postMessage({
    id: extensionId,
    type: "connect"
  })
}

function disconnect(extensionId: string): void {
  console.log("disconnect called with extension id", extensionId)

  globalThis.postMessage({
    id: extensionId,
    type: "disconnect"
  })
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
