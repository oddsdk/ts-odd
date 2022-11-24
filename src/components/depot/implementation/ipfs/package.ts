import type { IPFS } from "ipfs-core-types"
import type { Options } from "ipfs-core/types"


export type IPFSPackage = {
  create: (options?: Options) => IPFS
}