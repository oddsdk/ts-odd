import type { Implementation, ImplementationOptions } from "../implementation.js"
import * as FileSystem from "../../../fs/types.js"


// 🛳


export function implementation(opts: ImplementationOptions): Implementation {
  return {
    log: opts.configuration.debug ? console.log : () => { },
    warn: opts.configuration.debug ? console.warn : () => { },

    // WASM
    wnfsWasmLookup: wnfsVersion => fetch(`https://unpkg.com/wnfs@${wnfsVersion}/wasm_wnfs_bg.wasm`),

    // File system
    fileSystem: {
      hooks: {
        afterLoadExisting: async () => { },
        afterLoadNew: async (fs: FileSystem.API) => { await fs.publish() },
        beforeLoadExisting: async () => { },
        beforeLoadNew: async () => { },
      },
    },
  }
}