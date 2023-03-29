import { AppInfo } from "./appInfo.js"
import { isString } from "./common/type-checks.js"
import { appId, Permissions, ROOT_FILESYSTEM_PERMISSIONS } from "./permissions.js"


// CONFIGURATION


export type Configuration = {
  namespace: string | AppInfo

  /**
   * Enable debug mode.
   *
   * @default false
   */
  debug?: boolean

  /**
   * Debugging settings.
   */
  debugging?: {
    /**
    * Should I emit window post messages with session and filesystem information?
    *
    * @default true
    */
    emitWindowPostMessages?: boolean

    /**
     * Should I add programs to the global context while in debugging mode?
     *
     * @default true
     */
    injectIntoGlobalContext?: boolean
  }

  /**
   * File system settings.
   */
  fileSystem?: {
    /**
     * Should I load the file system immediately?
     *
     * @default true
     */
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
   * Configure messages that the ODD SDK sends to users.
   *
   * `versionMismatch.newer` is shown when the ODD SDK detects
   *  that the user's file system is newer than what this version of the ODD SDK supports.
   * `versionMismatch.older` is shown when the ODD SDK detects that the user's
   *  file system is older than what this version of the ODD SDK supports.
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


export function addRootFileSystemPermissions(config: Configuration): Configuration {
  return { ...config, permissions: { ...config.permissions, ...ROOT_FILESYSTEM_PERMISSIONS } }
}


/**
 * Generate a namespace string based on a configuration.
 */
export function namespace(config: Configuration): string {
  return isString(config.namespace) ? config.namespace : appId(config.namespace)
}