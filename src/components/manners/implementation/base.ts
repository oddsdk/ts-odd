import type { Implementation, ImplementationOptions } from "../implementation.js"
import { addSampleData } from "../../../fs/sample.js"
import FileSystem from "../../../fs/filesystem.js"


// 🛳


export function implementation(opts: ImplementationOptions): Implementation<FileSystem> {
  return {
    log: opts.configuration.debug ? console.log : () => { },
    warn: opts.configuration.debug ? console.warn : () => { },

    // WASM
    wnfsWasmLookup: wnfsVersion => fetch(`https://unpkg.com/wnfs@${wnfsVersion}/wasm_wnfs_bg.wasm`),

    // File system
    fileSystem: {
      hooks: {
        afterLoadExisting: (fs: FileSystem) => addSampleData(fs),
        afterLoadNew: async (fs: FileSystem) => { },
        beforeLoadExisting: async () => { },
        beforeLoadNew: async () => { },
      },
    },
  }
}