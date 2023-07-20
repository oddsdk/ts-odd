import { Implementation } from "../implementation.js"

import * as FissionEndpoints from "../../../common/fission.js"
import { Storage } from "../../../components.js"
import * as IPFS from "./ipfs-bitswap-websockets.js"

// 🛳

export async function implementation(
  storage: Storage.Implementation,
  blockstoreName: string
): Promise<Implementation> {
  return IPFS.implementation({
    blockstoreName,
    storage,
    gatewayUrl: FissionEndpoints.DEVELOPMENT.ipfsGateway,
    peersUrl: FissionEndpoints.DEVELOPMENT.server + "/ipfs/peers",
  })
}
