import file from './file'
import { addLink, addNestedLink, emptyFolder, toHash, splitPath, resolveDAGNode, rawToDAGLink, nodeToDAGLink, } from './helpers'
import { getIpfs, CID, FileContent, UnixFSFile, DAGLink } from '../ipfs'

export async function make(root: CID, folderPath: string): Promise<CID> {
  const path = splitPath(folderPath)
  if(path.length === 0){
    return root
  }
  const empty = await emptyFolder()
  const link = await nodeToDAGLink(empty, path[path.length -1] )
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

export async function getEncryptedKeyForFolder(cid: CID): Promise<string | undefined> {
  const filelist = await list(cid)
  const headerDir = filelist.find(node => node.name === 'header')
  console.log('headerDir: ', headerDir)
  if(!headerDir) {
    return undefined
  }
  console.log('cid: ', headerDir.cid.toString())
  const headerList = await list(headerDir.cid.toString())
  console.log("headerList: ", headerList)
  const key = headerList.find(node => node.name === 'key')
  if(!key) {
    return undefined
  }
  return file.cat(key.cid.toString())
}

export async function isPrivate(cid: CID): Promise<boolean> {
  const key = await getEncryptedKeyForFolder(cid)
  return key !== undefined
}

export default {
  make,
  list,
}
