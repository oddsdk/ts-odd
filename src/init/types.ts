import { Permissions } from "../ucan/permissions.js"


/**
 * Initialisation error
 */
export enum InitialisationError {
  InsecureContext = "INSECURE_CONTEXT",
  UnsupportedBrowser = "UNSUPPORTED_BROWSER"
}



// INTIALISE


export type InitOptions = AppInitOptions | LinkedAppInitOptions

export type AppInitOptions = {
  // Options
  loadFileSystem?: boolean
  rootKey?: string
  useWnfs?: boolean
}

export type LinkedAppInitOptions = {
  permissions?: Permissions

  // Options
  autoRemoveUrlParams?: boolean
  loadFileSystem?: boolean
  rootKey?: string
}

