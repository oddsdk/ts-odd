import * as fs from "fs"
import { IPFS } from "ipfs-core"
import { CID } from "multiformats"
import { CarBlockIterator } from "@ipld/car"

/**
 * @returns the roots defined in the CAR file
 */
export async function loadCAR(filepath: string, ipfs: IPFS): Promise<{ roots: CID[]; cids: CID[] }> {
  const inStream = fs.createReadStream(filepath)
  try {
    const cids: CID[] = []
    const blockIterator = await CarBlockIterator.fromIterable(inStream)
    for await (const block of blockIterator) {
      // @ts-ignore
      cids.push(block.cid)
      await ipfs.block.put(block.bytes, { cid: block.cid })
    }
    return {
      // @ts-ignore
      roots: await blockIterator.getRoots(),
      cids,
    }
  } finally {
    inStream.close()
  }
}

