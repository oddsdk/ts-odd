import type { IPFS } from "ipfs-core-types"
import loadScript from "load-script"

import * as ipfsNode from "./node.js"
import { IPFSPackage } from "./types.js"


export const DEFAULT_CDN_URL = "https://unpkg.com/ipfs-core@0.15.4/dist/index.min.js"


let ipfs: IPFS | null = null


/**
 * Set the currently active IPFS node.
 * The default is a node based on the ipfs-core package from a CDN (see `DEFAULT_CDN_URL`)
 */
export const set = (userIpfs: unknown): void => {
  ipfs = userIpfs as IPFS
}

/**
 * Get the currently active IPFS node.
 * Will automatically create one if none is active yet.
 */
export const get = async (): Promise<IPFS> => {
  if (!ipfs) ipfs = await nodeWithPkg(
    await pkgFromCDN(DEFAULT_CDN_URL)
  )

  return ipfs
}

/**
 * Create an IPFS Node given a `IPFSPackage`,
 * which you can get from `pkgFromCDN` or `pkgFromBundle`.
 */
export const nodeWithPkg = (pkg: IPFSPackage): Promise<IPFS> => {
  return ipfsNode.createAndConnect(pkg)
}

/**
 * Loads ipfs-core from a CDN.
 * NOTE: Make sure to cache this URL with a service worker if you want to make your app available offline.
 */
export const pkgFromCDN = async (cdn_url: string): Promise<IPFSPackage> => {
  if (!cdn_url) throw new Error("This function requires a URL to a CDN")
  return new Promise((resolve, reject) => {
    loadScript(cdn_url, err => {
      if (err) return reject(err)
      return resolve((self as any).IpfsCore as IPFSPackage)
    })
  })
}

/**
 * Loads ipfs-core from the bundled `webnative/lib/vendor/ipfs.js`
 */
export const pkgFromBundle = (): Promise<IPFSPackage> => {
  // @ts-ignore - Vendored dependency, generated at build time
  return import("../vendor/ipfs.js")
}
