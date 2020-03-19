import dagPB from 'ipld-dag-pb'
import keystore from '../keystore'
import aes from 'keystore-idb/aes'
import file from './file'
import dir from './dir'
import { emptyDirCID, addLink, cidToDAGLink, splitPath, addNestedLinkRecurse, toHash } from './helpers'
import { CID, DAGNode, FileContent, FileContentRaw } from '../ipfs'

export async function emptyPrivateDir(): Promise<CID> {
  const header = await headerDir()
  const headerLink = await cidToDAGLink(header, 'header')
  const data = await emptyDirCID()
  const dataLink = await cidToDAGLink(data, 'data')
  const dir = await emptyDirCID()
  const dirPartial = await addLink(dir, headerLink)
  return addLink(dirPartial, dataLink)
}

export async function headerDir(): Promise<CID> {
  const symmKey = await aes.makeKey()
  const symmKeyStr = await aes.exportKey(symmKey)
  const ks = await keystore.get()
  const ownPubkey = await ks.publicReadKey()
  const encryptedKey = await ks.encrypt(symmKeyStr, ownPubkey)
  const fileCID = await file.add(encryptedKey)
  const link = await cidToDAGLink(fileCID, 'key')
  const dir = await emptyDirCID()
  return addLink(dir, link)
}

export async function resolveToDataDir(root: CID): Promise<DAGNode | null> {
  const key = await getSymmKeyForDir(root)
  if(key === null) {
    return null
  }
  const dataCID = await dir.get(root, 'data')
  if(dataCID === null) {
    return null
  }
  const dataRaw = await file.cat(dataCID)
  return decryptDAGNode(dataRaw, key)
}

export async function getEncryptedKeyForPrivDir(root: CID): Promise<string | null> {
  const cid = await dir.get(root, 'private/header/key')
  if(cid === null){
    return null
  }
  return file.cat(cid)
}

export async function getEncryptedKeyForDir(root: CID): Promise<string | null> {
  const cid = await dir.get(root, 'header/key')
  if(cid === null){
    return null
  }
  return file.cat(cid)
}

export async function getSymmKeyForDir(root: CID): Promise<string | null> {
  const encrypted = await getEncryptedKeyForDir(root)
  if(encrypted === null) {
    return null
  }
  const ks = await keystore.get()
  const ownPubkey = await ks.publicReadKey()
  return ks.decrypt(encrypted, ownPubkey)
}

export async function encryptDAGNode(node: DAGNode, key: string): Promise<string> {
  const nodeStr = JSON.stringify(node.toJSON())
  return aes.encrypt(nodeStr, key)
}

export async function decryptDAGNode(encrypted: string, key: string): Promise<DAGNode> {
  const nodeStr = await aes.decrypt(encrypted, key)
  console.log('nodeStr: ', nodeStr)
  const { data, links } = JSON.parse(nodeStr)
  console.log('data: ', data)
  console.log('links: ', links)
  return new dagPB.DAGNode(Buffer.from(data), links)
}

export async function encryptContent(content: FileContent, key: string): Promise<string> {
  // @@TODO: expand this to include other data types
  const contentStr = content.toString()
  return aes.encrypt(contentStr, key)
}

export async function decryptContent(encrypted: string, key: string): Promise<FileContent> {
  // @@TODO: deserialize this into the proper file content.
  // is this possible without metadata??
  return aes.decrypt(encrypted, key)
}

export function checkIsPrivate(path: string) {
  const split = splitPath(path)
  if(split[0] !== 'private'){
    throw new Error('Must be "private" folder')
  }
}

export async function addToPrivateFolder(content: FileContent, filename: string, root: CID, folderPath: string = 'private'): Promise<CID> {
  checkIsPrivate(folderPath)
  const paths = splitPath(folderPath)
  const privDirCID = await dir.get(root, 'private')
  if(privDirCID === null){
    throw new Error("no priv dir")
  }
  // @@TODO: get a real key here
  const encryptedKey = await getEncryptedKeyForPrivDir(root)
  if(!encryptedKey){
    throw new Error('no key')
  }
  const ks = await keystore.get()
  const ownPubkey = await ks.publicReadKey()
  const symmKey = await ks.decrypt(encryptedKey, ownPubkey)
  const encrypted = await encryptContent(content, symmKey)
  const fileCID = await file.add(encrypted)
  const link = await cidToDAGLink(fileCID, filename)
  const updatedCID = await addNestedLinkRecurse(privDirCID, paths.slice(1), link, {
    shouldOverwrite: true,
    symmKey
  })
  const updatedLink = await cidToDAGLink(updatedCID, 'private')
  return addLink(root, updatedLink, { shouldOverwrite: true })
}

// export async function getFromPrivateFolder(root: CID, path: string = 'private'): Promise<FileContent> {
//   checkIsPrivate(path)
//   const paths = splitPath(path)
//   const privDirCID = await dir.get(root, 'private')
//   if(privDirCID === null){
//     throw new Error("no priv dir")
//   }
//   // @@TODO: get a real key here
//   const encryptedKey = await getEncryptedKeyForPrivDir(root)
//   if(!encryptedKey){
//     throw new Error('no key')
//   }
//   const ks = await keystore.get()
//   const ownPubkey = await ks.publicReadKey()
//   const symmKey = await ks.decrypt(encryptedKey, ownPubkey)
//   console.log('tick1')
//   const fileCID = await dir.getRecurse(privDirCID, paths.slice(1), symmKey)
//   console.log('tick2')
//   if(fileCID === null){
//     throw new Error('Could not find file')
//   }
//   console.log('tick')
//   const encrypted = await file.cat(fileCID)
//   return decryptContent(encrypted, symmKey)
// }

export default {
  emptyPrivateDir,
  headerDir,
  getEncryptedKeyForPrivDir,
  encryptDAGNode,
  decryptDAGNode,
  encryptContent,
  addToPrivateFolder,
  // getFromPrivateFolder,
}
