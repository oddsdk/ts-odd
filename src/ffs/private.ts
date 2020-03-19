import dagPB from 'ipld-dag-pb'
import keystore from '../keystore'
import aes from 'keystore-idb/aes'
import file from './file'
import dir from './dir'
import { emptyDirCID, addLink, cidToDAGLink, splitPath, addNestedLinkRecurse, toHash } from './helpers'
import { CID, DAGNode, FileContent } from '../ipfs'

export async function emptyPrivateDir(): Promise<CID> {
  const header = await headerDir()
  const link = await cidToDAGLink(header, 'header')
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
  const link = await cidToDAGLink(fileCID, 'key')
  const dir = await emptyDirCID()
  return addLink(dir, link)
}

export async function getEncryptedKeyForPrivDir(root: CID): Promise<string | undefined> {
  const cid = await dir.get(root, 'private/header/key')
  if(cid === null){
    return undefined
  }
  return file.cat(cid)
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

export async function decryptContent(encrypted: string, key: string): Promise<FileContent> {
  // @@TODO: deserialize this into the proper file content.
  // is this possible without metadata??
  return aes.decrypt(encrypted, key)
}

export async function addToPrivateFolder(content: FileContent, filename: string, root: CID, folderPath: string = 'private'): Promise<CID> {
  const paths = splitPath(folderPath)
  if(paths[0] !== 'private') {
    throw new Error('must be "private"')
  }
  const privDirCID = await dir.get(root, 'private')
  if(privDirCID === null){
    throw new Error("no priv dir")
  }
  const fileCID = await file.add(content)
  const link = await cidToDAGLink(fileCID, filename)
  // @@TODO: get a real key here
  const encryptedKey = await getEncryptedKeyForPrivDir(root)
  if(!encryptedKey){
    throw new Error('no key')
  }
  const ks = await keystore.get()
  const ownPubkey = await ks.publicReadKey()
  const symmKey = await ks.decrypt(encryptedKey, ownPubkey)
  const updatedCID = await addNestedLinkRecurse(privDirCID, paths.slice(1), link, {
    shouldOverwrite: true,
    symmKey
  })
  const updatedLink = await cidToDAGLink(updatedCID, 'private')
  return addLink(root, updatedLink, { shouldOverwrite: true })
}

export default {
  emptyPrivateDir,
  headerDir,
  getEncryptedKeyForPrivDir,
  encryptDAGNode,
  decryptDAGNode,
  encryptContent,
  addToPrivateFolder,
}
