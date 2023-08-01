import { Implementation } from "./implementation.js"

import * as Fission from "../../common/fission.js"
import { Storage } from "../../components.js"
import * as IPFS from "./ipfs-bitswap-websockets.js"

// 🛳

export async function implementation(
  storage: Storage.Implementation,
  blockstoreName: string,
  optionalEndpoints?: Fission.Endpoints
): Promise<Implementation> {
  const endpoints = optionalEndpoints || Fission.PRODUCTION

  return IPFS.implementation({
    blockstoreName,
    storage,
    gatewayUrl: endpoints.ipfsGateway,
    // FIXME: peersUrl: endpoints.server + "/ipfs/peers",
    peersUrl: "https://runfission.com/ipfs/peers",
  })
}
