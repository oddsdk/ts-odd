import * as base64 from './base64'
import * as blob from './blob'

export * from './types'
export * from './type-checks'
export * from './util'
export { base64, blob }

export const UCAN_STORAGE_KEY = "fission_sdk.auth_ucan"
export const USERNAME_STORAGE_KEY = "fission_sdk.auth_username"
