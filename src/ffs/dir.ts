import { addNestedLink, emptyFolder, splitPath, toHash } from './helpers'
import { getIpfs, CID, UnixFSFile } from '../ipfs'

export async function make(root: CID, folderPath: string): Promise<CID> {
  const path = splitPath(folderPath)
  if(path.length === 0){
    return root
  }
  const empty = await emptyFolder()
  const link = await empty.toDAGLink({ name: path[path.length -1] })
  const restOfPath = path.slice(0, path.length -1).join('/')
  const updated = await addNestedLink(root, restOfPath, link, false)
  return toHash(updated)
}

export async function list(cid: CID): Promise<UnixFSFile[]> {
  const ipfs = await getIpfs()
  const result = await ipfs.ls(cid)

  // if good old array
  if (Array.isArray(result)) {
    return result
  }

  // if async iterable
  const array = []
  for await (const file of result) {
    array.push(file)
  }
  return array
}

export default {
  make,
  list,
}
