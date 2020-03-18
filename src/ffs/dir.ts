import file from './file'
import { addNestedLink, emptyDir, splitPath, nodeToDAGLink, toDAGLink, addLink } from './helpers'
import { emptyPrivateDir } from './private'
import { getIpfs, UnixFSFile, CID } from '../ipfs'

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

export async function make(root: CID, folderPath: string): Promise<CID> {
  const path = splitPath(folderPath)
  if(path.length === 0){
    return root
  }
  const empty = await emptyDir()
  const link = await nodeToDAGLink(empty, path[path.length -1] )
  const restOfPath = path.slice(0, path.length -1).join('/')
  return addNestedLink(root, restOfPath, link, { shouldOverwrite: false })
}

export async function addPrivateDir(root: CID): Promise<CID> {
  const priv = await emptyPrivateDir()
  const link = toDAGLink(priv, 'private')
  return addLink(root, link)
}

export default {
  make,
  list,
}
