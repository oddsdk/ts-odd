import type { Implementation, ImplementationOptions } from "../implementation.js"


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
        afterLoadNew: async () => { },
        beforeLoadExisting: async () => { },
        beforeLoadNew: async () => { },
      },
    },
  }
}