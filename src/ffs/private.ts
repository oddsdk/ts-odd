import dagPB from 'ipld-dag-pb'
import keystore from '../keystore'
import aes from 'keystore-idb/aes'
import file from './file'
import dir from './dir'
import { emptyDirCID, addLink, toDAGLink } from './helpers'
import { CID, DAGNode, FileContent } from '../ipfs'

export async function emptyPrivateDir(): Promise<CID> {
  const header = await headerDir()
  const link = toDAGLink(header, 'header')
  const dir = await emptyDirCID()
  return addLink(dir, link)
}

export async function headerDir(): Promise<CID> {
  const symmKey = await aes.makeKey()
  const symmKeyStr = await aes.exportKey(symmKey)
  const ks = await keystore.get()
  const ownPubkey = await ks.publicReadKey()
  const encryptedKey = await ks.encrypt(symmKeyStr, ownPubkey)
  const fileCID = await file.add(encryptedKey)
  const link = await file.cidToDAGLink(fileCID, 'key')
  const dir = await emptyDirCID()
  return addLink(dir, link)
}

export async function getEncryptedKeyForFolder(cid: CID): Promise<string | undefined> {
  const filelist = await dir.list(cid)
  const headerDir = filelist.find(node => node.name === 'header')
  if(!headerDir) {
    return undefined
  }
  const headerList = await dir.list(headerDir.cid.toString())
  const key = headerList.find(node => node.name === 'key')
  if(!key) {
    return undefined
  }
  return file.cat(key.cid.toString())
}

export async function encryptDAGNode(node: DAGNode, key: string): Promise<string> {
  const nodeStr = JSON.stringify(node.toJSON())
  return aes.encrypt(nodeStr, key)
}

export async function decryptDAGNode(encrypted: string, key: string): Promise<DAGNode> {
  const nodeStr = await aes.decrypt(encrypted, key)
  const { data, links } = JSON.parse(nodeStr)
  return new dagPB.DAGNode(Buffer.from(data), links)
}

export async function encryptContent(content: FileContent, key: string): Promise<string> {
  // @@TODO: expand this to include other data types
  const contentStr = content.toString()
  return aes.encrypt(contentStr, key)
}

// export async function addToPrivateFolder(content: FileContent, filename: string, root: CID, folderPath: string = 'private'): Promise<CID> {
//   const paths = splitPath(folderPath)
//   if(paths[0] !== 'private') {
//     throw new Error ('must be "private"')
//   }
//   const fakeKey = await aes.makeKey()
//   const fakeKeyStr = await aes.exportKey(fakeKey)
//   const encrypted = await encryptContent(content, fakeKeyStr)


//   return 'fakecid'
// }

export default {
  emptyPrivateDir,
  headerDir,
  encryptDAGNode,
  decryptDAGNode,
  encryptContent,
}
