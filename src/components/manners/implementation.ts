import { CID } from "multiformats"

import type { Configuration } from "../../configuration.js"

import * as Crypto from "../../components/crypto/implementation.js"
import * as Depot from "../../components/depot/implementation.js"
import * as Reference from "../../components/reference/implementation.js"
import * as Storage from "../../components/storage/implementation.js"

import * as FS from "../../fs/types.js"
import { FileSystem } from "../../fs/class.js"


export type ImplementationOptions = {
  configuration: Configuration
}


export type DataComponents = {
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  reference: Reference.Implementation
  storage: Storage.Implementation
}


export type Implementation = {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void

  /**
   * Configure how the wnfs wasm module should be loaded.
   *
   * This only has an effect if you're using file systems of version 3 or higher.
   *
   * By default this loads the required version of the wasm wnfs module from unpkg.com.
   */
  wnfsWasmLookup: (wnfsVersion: string) => Promise<BufferSource | Response>

  /**
   * File system.
   */
  fileSystem: {
    /**
     * Various file system hooks.
     */
    hooks: {
      afterLoadExisting: (fs: FileSystem, account: FS.AssociatedIdentity, dataComponents: DataComponents) => Promise<void>
      afterLoadNew: (fs: FileSystem, account: FS.AssociatedIdentity, dataComponents: DataComponents) => Promise<void>
      beforeLoadExisting: (cid: CID, account: FS.AssociatedIdentity, dataComponents: DataComponents) => Promise<void>
      beforeLoadNew: (account: FS.AssociatedIdentity, dataComponents: DataComponents) => Promise<void>
    }
  }
}