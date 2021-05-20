import fs from 'fs'
import { CID, IPFS } from 'ipfs-core'
import { CarBlockIterator } from '@ipld/car'

export async function loadCAR(filepath: string, ipfs: IPFS): Promise<CID[]> {
  const inStream = fs.createReadStream(filepath)
  const cids = []
  for await (const { cid, bytes } of await CarBlockIterator.fromIterable(inStream)) {
    cids.push(cid)
    await ipfs.block.put(bytes, { cid })
  }
  return cids
}

