import { isString } from "./common/type-checks.js"
import { appId, AppInfo, Permissions } from "./permissions.js"


// CONFIGURATION


export type Configuration = {
  namespace: string | AppInfo
  debug?: boolean

  filesystem?: {
    /* Should I load the filesystem immediately? True by default. */
    loadImmediately?: boolean

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
  permissions?: Permissions

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



// PIECES


export type UserMessages = {
  versionMismatch: {
    newer(version: string): Promise<void>
    older(version: string): Promise<void>
  }
}



// 🛠


export function namespaceToString(namespace: string | AppInfo): string {
  return isString(namespace) ? namespace : appId(namespace)
}