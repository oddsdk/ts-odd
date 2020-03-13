import { addFile, cidToDAGLink, addLink, addNestedLink, emptyFolder, splitPath, toHash } from './helpers'
import { CID } from '../ipfs'

export async function addFileToFolder(file: Blob, filename: string, parent: CID): Promise<CID> {
  const fileCID = await addFile(file)
  const link = await cidToDAGLink(fileCID, filename)
  const updated = await addLink(parent, link)
  return toHash(updated)
}

export async function addFileToNestedFolder(file: Blob, filename: string, root: CID, folderPath: string): Promise<CID> {
  const fileCID = await addFile(file)
  const link = await cidToDAGLink(fileCID, filename)
  const updated = await addNestedLink(root, folderPath, link, true)
  return toHash(updated)
}

export async function mkdir(parent: CID, folderName: string): Promise<CID> {
  const child = await emptyFolder()
  const childLink = await child.toDAGLink({ name: folderName })
  const updated = await addNestedLink(parent, "", childLink, false)
  return toHash(updated)
}

export async function mkdirp(root: CID, folderPath: string): Promise<CID> {
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
