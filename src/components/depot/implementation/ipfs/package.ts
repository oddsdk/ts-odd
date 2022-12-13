import type { Config } from "ipfs-core-types/src/config/index.js"
import type { IPFS } from "ipfs-core-types"
import type { IPFSRepo } from "ipfs-repo"
import type { KeyType } from "@libp2p/interface-keys"
import type { Libp2pOptions } from "libp2p"
import type { PeerId } from "@libp2p/interface-peer-id"


/**
 * See https://github.com/ipfs/js-ipfs/blob/6be59068cc99c517526bfa123ad475ae05fcbaef/packages/ipfs-core/src/types.ts#L15 for more info.
 */
export type Options = {
  config?: Config
  init?: {
    algorithm?: KeyType
    allowNew?: boolean
    bits?: number
    emptyRepo?: boolean
    privateKey?: PeerId | string
    profiles?: string[]
  }
  libp2p?: Partial<Libp2pOptions>
  pass?: string
  preload?: {
    enabled?: boolean
    cache?: number
    addresses?: string[]
  }
  relay?: {
    enabled?: boolean
    hop?: {
      enabled?: boolean
      active?: boolean
    }
  }
  repo?: IPFSRepo
  repoAutoMigrate?: boolean
  silent?: boolean
}


export type IPFSPackage = {
  create: (options?: Options) => IPFS
}