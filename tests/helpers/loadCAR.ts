import * as fs from "fs"
import all from "it-all"
import { IPFS } from "ipfs-core-types"
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

export async function loadCARWithRoot(filepath: string, ipfs: IPFS): Promise<CID> {
  const { roots } = await loadCAR(filepath, ipfs)
  const [rootCID] = roots

  if (rootCID == null) {
    throw new Error(`CAR file at ${filepath} doesn't have a root specified.`)
  }
  return rootCID
}
