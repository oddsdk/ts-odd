import FileSystem from "../../src/fs/filesystem.js"
import * as path from "../../src/path.js"

export const emptyFilesystem: () => Promise<FileSystem> = async () => {
  return FileSystem.empty({
    localOnly: true,
    permissions: {
      fs: {
        public: [path.root()],
        private: [path.root()]
      }
    }
  })
}
