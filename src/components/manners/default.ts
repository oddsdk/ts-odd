import type { Implementation } from "./implementation.js"

import { Configuration } from "../../configuration.js"
import { FileSystem } from "../../fs/class.js"
import * as Path from "../../path/index.js"

// 🛳

export function implementation(config: Configuration): Implementation<FileSystem> {
  return {
    log: config.debug ? console.log : () => {},
    warn: config.debug ? console.warn : () => {},

    // File system
    fileSystem: {
      hooks: {
        afterLoadExisting: async () => {},
        afterLoadNew: async (fs: FileSystem) => {
          // We assume that the client creating a new file system that
          // has full access to the file system. Here we create a new
          // private node that is mounted at the root path (ie. root private dir)
          return fs.mountPrivateNode({ path: Path.root() })
        },
        beforeLoadExisting: async () => {},
        beforeLoadNew: async () => {},
      },
    },

    // WASM
    wnfsWasmLookup: wnfsVersion => fetch(`https://unpkg.com/wnfs@${wnfsVersion}/wnfs_wasm_bg.wasm`),
  }
}
