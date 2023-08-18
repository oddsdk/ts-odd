import type { Implementation } from "./implementation.js"

import { Configuration } from "../../configuration.js"
import { EventEmitter, createEmitter } from "../../events/emitter.js"
import * as Events from "../../events/program.js"
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
  warn: Implementation<FS>["warn"],
  programEmitter: EventEmitter<Events.Program>
): () => boolean {
  if (!globalThis.navigator) {
    warn("`navigator` object not available, setting `online` to `false`!")
    return () => false
  }

  let online = globalThis.navigator.onLine

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

////////
// 🛳 //
////////

export function implementation(config: Configuration): Implementation<FileSystem> {
  const programEmitter = createEmitter<Events.Program>()

  // Loggers
  const log = config.debug ? console.log : () => {}
  const warn = config.debug ? console.warn : () => {}

  // Fin
  return {
    log,
    warn,

    fileSystem: {
      hooks: fileSystemHooks,
    },

    program: {
      eventEmitter: programEmitter,
      online: onlineBehaviour(log, warn, programEmitter),
    },
  }
}
