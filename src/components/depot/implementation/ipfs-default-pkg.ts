import * as Ipfs from "./ipfs/index.js"
import * as IpfsBase from "./ipfs.js"
import { Implementation } from "../implementation.js"


// 🛳


export async function implementation(peersUrl: string, repoName: string): Promise<Implementation> {
  const [ ipfs, repo ] = await Ipfs.nodeWithPkg(
    await Ipfs.pkgFromCDN(Ipfs.DEFAULT_CDN_URL),
    peersUrl,
    repoName,
    false
  )

  return IpfsBase.implementation(ipfs, repo)
}