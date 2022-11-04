import * as Auth from "./components/auth/implementation.js"
import * as Confidences from "./components/confidences/implementation.js"
import * as Crypto from "./components/crypto/implementation.js"
import * as Depot from "./components/depot/implementation.js"
import * as Manners from "./components/manners/implementation.js"
import * as Reference from "./components/reference/implementation.js"
import * as Storage from "./components/storage/implementation.js"

import { AppInfo, ConfigurablePermissions } from "./permissions.js"


// COMPONENTS


export type Components = {
  auth: Auth.Implementation[]
  confidences: Confidences.Implementation
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation
  storage: Storage.Implementation
}


export type ComponentsWithoutAuth = {
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation
  storage: Storage.Implementation
}



// CONFIGURATION


export type Configuration = {
  appInfo: AppInfo
  debug?: boolean

  filesystem?: {
    /* Should I load the filesystem immediately? True by default. */
    loadImmediately?: boolean

    /* Configure whether webnative should aggressively pin everything, or pin nothing at all. */
    shouldPin?: boolean

    /**
     * Set the file system version.
     *
     * This will only affect new file systems created.
     * Existing file systems (whether loaded from another device or loaded locally) continue
     * using the same version.
     * If you're looking to migrate an existing file system to a new file system version,
     * please look for migration tooling.
     */
    version?: string
  }

  /**
   * Permissions to ask a root authority.
   */
  permissions?: ConfigurablePermissions

  /**
   * Configure messages that webnative sends to users.
   *
   * `versionMismatch.newer` is shown when webnative detects
   *  that the user's filesystem is newer than what this version of webnative supports.
   * `versionMismatch.older` is shown when webnative detects that the user's
   *  filesystem is older than what this version of webnative supports.
   */
  userMessages?: UserMessages
}



// OPTIONS


export function extractConfig(opts: Partial<Components> & Configuration): Configuration {
  return {
    appInfo: opts.appInfo,
    debug: opts.debug,
    filesystem: opts.filesystem,
    userMessages: opts.userMessages,
  }
}


export function isConfidentialAuthConfiguration(config: Configuration): boolean {
  return !!config.permissions
}



// OTHER


export enum InitialisationError {
  InsecureContext = "INSECURE_CONTEXT",
  UnsupportedBrowser = "UNSUPPORTED_BROWSER"
}

export type UserMessages = {
  versionMismatch: {
    newer(version: string): Promise<void>
    older(version: string): Promise<void>
  }
}