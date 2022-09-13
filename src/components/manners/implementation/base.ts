import type { Implementation, ImplementationOptions } from "../implementation.js"


// 🛳


export function implementation(opts: ImplementationOptions): Implementation {
  return {
    log: opts.configuration.debug ? console.log : () => { },
    warn: opts.configuration.debug ? console.warn : () => { },

    wnfsWasmLookup: wnfsVersion => fetch(`https://unpkg.com/wnfs@${wnfsVersion}/wasm_wnfs_bg.wasm`)
  }
}