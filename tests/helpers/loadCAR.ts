import * as fs from 'fs'
import { CID, IPFS } from 'ipfs-core'
import { CarBlockIterator } from '@ipld/car'

export async function loadCAR(filepath: string, ipfs: IPFS): Promise<CID[]> {
  const inStream = fs.createReadStream(filepath)
  try {
    const cids: CID[] = []
    for await (const block of await CarBlockIterator.fromIterable(inStream)) {
      cids.push(block.cid as unknown as CID)
      await ipfs.block.put(block.bytes, { cid: block.cid })
    }
    return cids as CID[]
  } finally {
    inStream.close()
  }
}

