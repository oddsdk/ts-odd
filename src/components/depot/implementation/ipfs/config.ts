import type { IPFS } from "ipfs-core-types"
import { Repo } from "ipfs-core/components/network"
import { Dependencies } from "../../../../fs/filesystem.js"

import * as ipfsNode from "./node.js"
import { IPFSPackage } from "./package.js"


export const DEFAULT_CDN_URL = "https://unpkg.com/ipfs-core@0.15.4/dist/index.min.js"


/**
 * Create an IPFS Node given a `IPFSPackage`,
 * which you can get from `pkgFromCDN` or `pkgFromBundle`.
 */
export const nodeWithPkg = (
  dependencies: ipfsNode.Dependencies,
  pkg: IPFSPackage,
  peersUrl: string,
  repoName: string,
  logging: boolean
): Promise<{ ipfs: IPFS, repo: Repo }> => {
  return ipfsNode.createAndConnect(dependencies, pkg, peersUrl, repoName, logging)
}

/**
 * Loads ipfs-core from a CDN.
 * NOTE: Make sure to cache this URL with a service worker if you want to make your app available offline.
 */
export const pkgFromCDN = async (cdn_url: string): Promise<IPFSPackage> => {
  if (!cdn_url) throw new Error("This function requires a URL to a CDN")
  return import(/* @vite-ignore *//* webpackIgnore: true */ cdn_url).then(_ => (self as any).IpfsCore as IPFSPackage)
}

// /**
//  * Loads ipfs-core from the bundled `webnative/lib/vendor/ipfs.js`
//  */
// export const pkgFromBundle = (): Promise<IPFSPackage> => {
//   // @ts-ignore - Vendored dependency, generated at build time
//   return import("../vendor/ipfs.js")
// }
