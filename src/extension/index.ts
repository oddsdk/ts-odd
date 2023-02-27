import type { AppInfo, AuthenticationStrategy, CID, FileSystemShortHands, ShortHands, Session } from "../index.js"
import type { Maybe } from "../index.js"

import { VERSION } from "../index.js"

type Connection = {
  extensionId: string | null
  connected: boolean
}

type WebnativeInfo = {
  version: string
  namespace: AppInfo | string
  username: string | null
  accountDID: string | null
  agentDID: string
  dataRootCID: string | null
  capabilities?: Permissions
}

export async function create(config: {
  auth: AuthenticationStrategy
  capabilities: { session: (username: string) => Promise<Maybe<Session>> }
  lookupDataRoot: (username: string) => Promise<CID | null>
  namespace: AppInfo | string
  session: Maybe<Session>
  shorthands: ShortHands & { fileSystem: FileSystemShortHands }
}): Promise<{
  connect: (extensionId: string) => void
  disconnect: (extensionId: string) => void
}> {
  let connection: Connection = { extensionId: null, connected: false }
  let webnativeInfo = await collectData(config)

  console.log("webnativeInfo", webnativeInfo)

  return {
    connect: (extensionId: string) => {
      connect(extensionId)
      connection = { extensionId, connected: true }

      sendData(connection, webnativeInfo)
    },
    disconnect: (extensionId: string) => {
      disconnect(extensionId)
      connection = { extensionId, connected: false }
    }
  }
}

function sendData(connection: Connection, webnativeInfo: WebnativeInfo) {
  if (connection.connected) {
    globalThis.postMessage({
      id: connection.extensionId,
      type: "data",
      data: webnativeInfo
    })
  }
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

async function collectData(config: {
  auth: AuthenticationStrategy
  capabilities: { session: (username: string) => Promise<Maybe<Session>> }
  lookupDataRoot: (username: string) => Promise<CID | null>
  namespace: AppInfo | string
  session: Maybe<Session>
  shorthands: ShortHands & { fileSystem: FileSystemShortHands }
}): Promise<WebnativeInfo> {
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
    version: VERSION,
    namespace,
    username,
    accountDID,
    agentDID,
    dataRootCID: dataRootCID?.toString() ?? null
  }

}
