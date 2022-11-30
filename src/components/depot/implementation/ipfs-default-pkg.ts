import * as Ipfs from "./ipfs/index.js"
import * as IpfsBase from "./ipfs.js"
import { Dependencies } from "./ipfs/node.js"
import { Implementation } from "../implementation.js"


// 🛳


export async function implementation(
  dependencies: Dependencies,
  peersUrl: string,
  repoName: string
): Promise<Implementation> {
  const [ ipfs, repo ] = await Ipfs.nodeWithPkg(
    dependencies,
    await Ipfs.pkgFromCDN(Ipfs.DEFAULT_CDN_URL),
    peersUrl,
    repoName,
    false
  )

  return IpfsBase.implementation(ipfs, repo)
}