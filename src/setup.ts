import internalSetup from './setup/internal'


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
export function ipfs(s: { [key: string]: unknown }): void {
  internalSetup.ipfs = s
}
