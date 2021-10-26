import FileSystem from "../../src/fs/filesystem.js"
import * as path from "../../src/path.js"
import * as identifiers from "../../src/common/identifiers.js"
import * as crypto from "../../src/crypto/index.js"

export const emptyFilesystem: () => Promise<FileSystem> = async () => {
  const rootKey = await crypto.aes.genKeyStr()
  return FileSystem.empty({
    localOnly: true,
    permissions: {
      fs: {
        public: [path.root()],
        private: [path.root()]
      }
    },
    rootKey
  })
}


export async function loadFilesystem(cid: string, readKey?: string): Promise<FileSystem> {
  if (readKey != null) {
    await crypto.keystore.importSymmKey(readKey, await identifiers.readKey({ path: path.directory("private") }))
  }

  const fs = await FileSystem.fromCID(cid, {
    localOnly: true,
    permissions: {
      fs: {
        public: [path.root()],
        private: [path.root()]
      }
    }
  })

  if (fs == null) {
    throw new Error(`Couldn't load filesystem from CID ${cid} (and readKey ${readKey})`)
  }

  return fs
}
