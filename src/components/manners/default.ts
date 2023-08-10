import type { Implementation } from "./implementation.js"

import { Configuration } from "../../configuration.js"
import * as Events from "../../events.js"
import { FileSystem } from "../../fs/class.js"
import * as Path from "../../path/index.js"

////////
// 🛠️ //
////////

export const fileSystemHooks = {
  afterLoadExisting: async () => {},
  afterLoadNew: async (fs: FileSystem) => {
    // We assume that the client creating a new file system that
    // has full access to the file system. Here we create a new
    // private node that is mounted at the root path (ie. root private dir)
    return fs.mountPrivateNode({ path: Path.root() })
  },
  beforeLoadExisting: async () => {},
  beforeLoadNew: async () => {},
}

export function onlineBehaviour<FS>(
  log: Implementation<FS>["log"],
  programEmitter: Events.Emitter<Events.Program>
): () => boolean {
  let online = navigator.onLine

  globalThis.addEventListener("offline", async () => {
    online = false
    log("🌍 Program is offline")
    programEmitter.emit("offline", void null)
  })

  globalThis.addEventListener("online", async () => {
    online = true
    log("🌍 Program is online")
    programEmitter.emit("online", void null)
  })

  return () => online
}

export function wasmLookup(wnfsVersion: string): Promise<BufferSource | Response> {
  return fetch(`https://unpkg.com/wnfs@${wnfsVersion}/wnfs_wasm_bg.wasm`)
}

////////
// 🛳 //
////////

export function implementation(config: Configuration): Implementation<FileSystem> {
  const programEmitter = Events.createEmitter<Events.Program>()

  // Loggers
  const log = config.debug ? console.log : () => {}
  const warn = config.debug ? console.warn : () => {}

  // Fin
  return {
    log,
    warn,

    fileSystem: {
      hooks: fileSystemHooks,
      wasmLookup,
    },

    program: {
      eventEmitter: programEmitter,
      online: onlineBehaviour(log, programEmitter),
    },
  }
}
