import { Implementation } from "../implementation.js"

import * as FissionEndpoints from "../../../common/fission.js"
import * as IPFS from "./ipfs.js"


// 🛳


export async function implementation(): Promise<Implementation> {
  return IPFS.implementation(FissionEndpoints.STAGING.server + "/ipfs/peers")
}