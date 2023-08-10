import * as Manners from "../components/manners/implementation.js"

import { default as init } from "wnfs"
import { WASM_WNFS_VERSION } from "../common/version.js"

// This is some global mutable state to work around global mutable state
// issues with wasm-bindgen. It's important we *never* accidentally initialize the
// "wnfs" Wasm module twice.
let initialized = false

export async function load<FS>({ manners }: { manners: Manners.Implementation<FS> }) {
  // MUST be prevented from initializing twice:
  // https://github.com/fission-codes/webnative/issues/429
  // https://github.com/rustwasm/wasm-bindgen/issues/3307
  if (initialized) return
  initialized = true

  manners.log(`🗃️ Loading file system WASM code`)
  const before = performance.now()
  // init accepts Promises as arguments
  await init(await manners.fileSystem.wasmLookup(WASM_WNFS_VERSION))
  const time = performance.now() - before
  manners.log(`🧪 Loaded file system WASM code (${time.toFixed(0)}ms)`)
}
