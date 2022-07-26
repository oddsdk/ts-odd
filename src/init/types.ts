import { Permissions } from "../ucan/permissions.js"


/**
 * Initialisation error
 */
export enum InitialisationError {
  InsecureContext = "INSECURE_CONTEXT",
  UnsupportedBrowser = "UNSUPPORTED_BROWSER"
}



// INTIALISE


export type InitOptions = AppInitOptions | PermissionedAppInitOptions

export type AppInitOptions = {
  // Options
  loadFileSystem?: boolean
  rootKey?: string
  useWnfs?: boolean
}

export type PermissionedAppInitOptions = {
  permissions?: Permissions

  // Options
  autoRemoveUrlParams?: boolean
  loadFileSystem?: boolean
  rootKey?: string
}

