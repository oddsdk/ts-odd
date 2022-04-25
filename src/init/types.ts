import { Permissions } from "../ucan/permissions.js"


/**
 * Initialisation error
 */
export enum InitialisationError {
  InsecureContext = "INSECURE_CONTEXT",
  UnsupportedBrowser = "UNSUPPORTED_BROWSER",
  UnsupportedLocalIpfs = "UNSUPPORTED_LOCAL_IPFS"
}



// INTIALISE
export type InitOptions = {
  permissions?: Permissions

  // Options
  autoRemoveUrlParams?: boolean
  loadFileSystem?: boolean
  localIpfs?: boolean
  rootKey?: string
}
