import * as fs from "fs"
import all from "it-all"
import { IPFS } from "ipfs-core"
import { CID } from "multiformats"

/**
 * @returns the roots defined in the CAR file
 */
export async function loadCAR(filepath: string, ipfs: IPFS): Promise<{ roots: CID[] }> {
  const inStream = fs.createReadStream(filepath)
  try {
    const roots = await all(ipfs.dag.import(inStream))
    return { roots: roots.map(root => root.root.cid) }
  } finally {
    inStream.close()
  }
}
