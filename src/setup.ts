import { Endpoints, setup as internalSetup } from './setup/internal'


type UnknownObject =
  { [key: string]: unknown }


/**
 * Toggle debug mode.
 *
 * Only adds a few `console.log`s at this moment.
 */
export function debug({ enabled }: { enabled: boolean }): boolean {
  internalSetup.debug = enabled
  return internalSetup.debug
}


/**
 * Override endpoints.
 *
 * You can override each of these,
 * no need to provide them all here.
 *
 * `api` Location of the Fission API
 *       (default `https://runfission.com`)
 * `lobby` Location of the authentication lobby.
 *         (default `https://auth.fission.codes`)
 * `user`  User's domain to use, will be prefixed by username.
 *         (default `fission.name`)
 */
export function endpoints(e: Partial<Endpoints>): Endpoints {
  internalSetup.endpoints = { ...internalSetup.endpoints, ...e }
  return { ...internalSetup.endpoints }
}


/**
 * Override the IPFS config.
 *
 * The given object will be merged together with the default configuration,
 * and then passed to `Ipfs.create()`
 *
 * If you wish to override the `config.Bootstrap` list,
 * you can get the default value as follows:
 * ```js
 * import { PEER_WSS, defaultOptions } from 'fission-sdk/ipfs'
 * // `PEER_WSS` is the default `Bootstrap` node
 * defaultOptions.config.Bootstrap
 * ```
 */
export function ipfs(s: UnknownObject): UnknownObject {
  internalSetup.ipfs = { ...s }
  return { ...internalSetup.ipfs }
}
