import { CID } from "multiformats/cid"

import * as Identifiers from "../../src/common/identifiers.js"
import * as Path from "../../src/path/index.js"
import FileSystem from "../../src/fs/filesystem.js"
import { account, components, crypto } from "./components.js"
import { createEmitter } from "../../src/events.js"


export function emptyFilesystem(version?: string): Promise<FileSystem> {
  const eventEmitter = createEmitter()

  return FileSystem.empty({
    account,
    dependencies: components,
    eventEmitter,
    localOnly: true,
    permissions: {
      fs: {
        public: [ Path.root() ],
        private: [ Path.root() ]
      }
    },
    version
  })
}


export async function loadFilesystem(cid: CID, readKey?: Uint8Array): Promise<FileSystem> {
  if (readKey != null) {
    await crypto.keystore.importSymmKey(
      readKey,
      await Identifiers.readKey({
        accountDID: account.rootDID,
        crypto,
        path: Path.directory("private")
      })
    )
  }

  const eventEmitter = createEmitter()
  const fs = await FileSystem.fromCID(cid, {
    account,
    dependencies: components,
    eventEmitter,
    localOnly: true,
    permissions: {
      fs: {
        public: [ Path.root() ],
        private: [ Path.root() ]
      }
    }
  })

  if (fs == null) {
    throw new Error(`Couldn't load filesystem from CID ${cid} (and readKey ${readKey})`)
  }

  return fs
}
