import type { IPFS } from "ipfs-core-types"
import type { IPFSRepo } from "ipfs-repo"

import * as ipfsNode from "./node.js"
import { Dependencies } from "../../../../fs/filesystem.js"
import { IPFSPackage } from "./package.js"


export const DEFAULT_CDN_URL = "https://unpkg.com/ipfs-core@0.17.0/dist/index.min.js"


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
): Promise<{ ipfs: IPFS, repo: IPFSRepo }> => {
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
