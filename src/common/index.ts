import * as api from './api'
import * as base64 from './base64'
import * as blob from './blob'
import * as arrbufs from './arrbufs'

export * from './types'
export * from './type-checks'
export * from './util'
export { api, base64, blob, arrbufs }

export const UCAN_STORAGE_KEY = "fission_sdk.auth_ucan"
export const USERNAME_STORAGE_KEY = "fission_sdk.auth_username"
