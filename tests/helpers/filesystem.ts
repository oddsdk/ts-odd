import FileSystem from '../../src/fs/filesystem.js'

import * as path from '../../src/path.js'
import * as crypto from '../../src/crypto/index.js'

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