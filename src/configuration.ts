import { AppInfo } from "./appInfo.js"
import { isString } from "./common/type-checks.js"

///////////////////
// CONFIGURATION //
///////////////////

/** @group Configuration */
export type Configuration = {
  namespace: string | AppInfo

  /**
   * Enable debug mode and configure it if needed.
   */
  debug?: boolean | {
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
   * Configure messages that the ODD SDK sends to users.
   *
   * `versionMismatch.newer` is shown when the ODD SDK detects
   *  that the user's file system is newer than what this version of the ODD SDK supports.
   * `versionMismatch.older` is shown when the ODD SDK detects that the user's
   *  file system is older than what this version of the ODD SDK supports.
   */
  userMessages?: UserMessages
}

////////////
// PIECES //
////////////

/** @group Configuration */
export type UserMessages = {
  versionMismatch: {
    newer(version: string): Promise<void>
    older(version: string): Promise<void>
  }
}

////////
// 🛠 //
////////

/**
 * App identifier.
 *
 * @group Configuration
 */
export function appId(app: AppInfo): string {
  return `${app.creator}/${app.name}`
}

/**
 * Extract a `Configuration` from an object containing one.
 *
 * @group Configuration
 */
export function extract(
  obj: Record<string, unknown> & Configuration
): Configuration {
  return {
    namespace: obj.namespace,
    debug: obj.debug,
    fileSystem: obj.fileSystem,
    userMessages: obj.userMessages,
  }
}

/**
 * Generate a namespace string based on a configuration.
 *
 * @group Configuration
 */
export function namespace(config: Configuration): string {
  return isString(config.namespace) ? config.namespace : appId(config.namespace)
}
