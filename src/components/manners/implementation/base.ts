import type { Implementation, ImplementationOptions } from "../implementation.js"

import * as Path from "../../../path/index.js"
import { FileSystem } from "../../../fs/class.js"


// 🛳


export function implementation(opts: ImplementationOptions): Implementation {
  return {
    log: opts.configuration.debug ? console.log : () => { },
    warn: opts.configuration.debug ? console.warn : () => { },

    // WASM
    wnfsWasmLookup: wnfsVersion => fetch(`https://unpkg.com/wnfs@${wnfsVersion}/wnfs_wasm_bg.wasm`),

    // File system
    fileSystem: {
      hooks: {
        afterLoadExisting: async () => { },
        afterLoadNew: async (fs: FileSystem) => {
          // We assume that the client creating a new file system that
          // has full access to the file system. Here we create a new
          // private node that is mounted at the root path (ie. root private dir)
          const { capsuleRef } = await fs.mountPrivateNode({ path: Path.root() })

          // Other clients that may have partial access to the file system
          // gain access through received UCANs. The file system class checks
          // for write access
          //
          // TODO: Create UCAN
        },
        beforeLoadExisting: async () => { },
        beforeLoadNew: async () => { },
      },
    },
  }
}