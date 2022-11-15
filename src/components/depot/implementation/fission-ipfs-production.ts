import { Implementation } from "../implementation.js"

import * as FissionEndpoints from "../../../common/fission.js"
import * as IPFS from "./ipfs-default-pkg.js"


// 🛳


export async function implementation(repoName: string): Promise<Implementation> {
  return IPFS.implementation(FissionEndpoints.PRODUCTION.server + "/ipfs/peers", repoName)
}