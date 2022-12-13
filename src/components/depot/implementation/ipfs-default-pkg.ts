import type { IPFS } from "ipfs-core-types"
import type { IPFSRepo } from "ipfs-repo"

import * as Ipfs from "./ipfs/index.js"
import * as IpfsBase from "./ipfs.js"
import { Dependencies } from "./ipfs/node.js"
import { Implementation } from "../implementation.js"
import { Maybe } from "../../../common/types.js"


// 🛳


export async function implementation(
  dependencies: Dependencies,
  peersUrl: string,
  repoName: string
): Promise<Implementation> {
  let instance: Maybe<{ ipfs: IPFS; repo: IPFSRepo }> = null

  return IpfsBase.implementation(async () => {
    if (instance) return instance

    instance = await Ipfs.nodeWithPkg(
      dependencies,
      await Ipfs.pkgFromCDN(Ipfs.DEFAULT_CDN_URL),
      peersUrl,
      repoName,
      false
    )

    return instance
  })
}