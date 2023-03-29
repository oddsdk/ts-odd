import { Implementation } from "../implementation.js"

import * as FissionEndpoints from "../../../common/fission.js"
import * as IPFS from "./ipfs-bitswap-websockets.js"
import { Storage } from "../../../components.js"


// 🛳


export async function implementation(
  storage: Storage.Implementation,
  blockstoreName: string
): Promise<Implementation> {
  return IPFS.implementation({
    blockstoreName,
    storage,
    gatewayUrl: FissionEndpoints.PRODUCTION.ipfsGateway,
    peersUrl: FissionEndpoints.PRODUCTION.server + "/ipfs/peers",
  })
}