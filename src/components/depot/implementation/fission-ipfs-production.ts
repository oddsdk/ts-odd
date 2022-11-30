import { Implementation } from "../implementation.js"

import * as FissionEndpoints from "../../../common/fission.js"
import * as IPFS from "./ipfs-default-pkg.js"
import { Dependencies } from "./ipfs/node.js"


// 🛳


export async function implementation(dependencies: Dependencies, repoName: string): Promise<Implementation> {
  return IPFS.implementation(dependencies, FissionEndpoints.PRODUCTION.server + "/ipfs/peers", repoName)
}