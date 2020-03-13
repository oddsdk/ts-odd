import keystore from '../keystore'
import aes from 'keystore-idb/aes'
import file from './file'
import { emptyFolder, addLink, resolveDAGNode, toHash } from './helpers'
import { CID, DAGNode } from '../ipfs'

export async function emptyPrivateFolder(): Promise<DAGNode> {
  const header = await headerFolder()
  const link = await header.toDAGLink({ name: 'header' })
  const dir = await emptyFolder()
  return addLink(dir, link)
}

export async function headerFolder(): Promise<DAGNode> {
  const symmKey = await aes.makeKey()
  const symmKeyStr = await aes.exportKey(symmKey)
  const ks = await keystore.get()
  const ownPubkey = await ks.publicReadKey()
  const encryptedKey = await ks.encrypt(symmKeyStr, ownPubkey)
  const fileCID = await file.add(encryptedKey)
  const link = await file.cidToDAGLink(fileCID, 'key')
  const dir = await emptyFolder()
  return addLink(dir, link)
}

export async function addPrivateFolder(root: CID): Promise<CID> {
  const [priv, node] = await Promise.all([
    emptyPrivateFolder(),
    resolveDAGNode(root)
  ])
  const link = await priv.toDAGLink({ name: 'private' })
  const updated = await addLink(node, link)
  return toHash(updated)
}
