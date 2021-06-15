import FileSystem from '../../src/fs/filesystem'

import * as path from '../../src/path'
import * as crypto from '../../src/crypto'

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