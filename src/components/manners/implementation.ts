import { CID } from "multiformats"

import type { Configuration } from "../../configuration.js"

import * as Depot from "../../components/depot/implementation.js"
import { PrivateReference } from "../../fs/types/private-ref.js"
import * as Path from "../../path/index.js"
import { CabinetCollection } from "../../repositories/cabinet.js"

export type ImplementationOptions = {
  configuration: Configuration
}

export type Implementation<FS> = {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void

  /**
   * File system.
   */
  fileSystem: {
    /**
     * Various file system hooks.
     */
    hooks: {
      afterLoadExisting: (fs: FS, depot: Depot.Implementation) => Promise<void>
      afterLoadNew: (fs: FS, depot: Depot.Implementation) => Promise<
        null | {
          path: Path.Distinctive<Path.Segments>
          capsuleRef: PrivateReference
        }
      >
      beforeLoadExisting: (cid: CID, depot: Depot.Implementation) => Promise<void>
      beforeLoadNew: (depot: Depot.Implementation) => Promise<void>
    }
  }

  /**
   * Configure how the wnfs wasm module should be loaded.
   *
   * This only has an effect if you're using file systems of version 3 or higher.
   *
   * By default this loads the required version of the wasm wnfs module from unpkg.com.
   */
  wnfsWasmLookup: (wnfsVersion: string) => Promise<BufferSource | Response>
}
