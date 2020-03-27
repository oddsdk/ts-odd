import util from './util'
import { PrivateTreeData, Tree, Link, PrivateTreeStatic } from '../types'
import ipfs, { CID, FileContent } from '../../ipfs'
import PublicTree from '../public/tree'

export class PrivateTree extends PublicTree {

  private key: string
  static: PrivateTreeStatic

  constructor(links: Link[], key: string) {
    super(links)
    this.key = key
    this.static = PrivateTree
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return obj.putEncrypted !== undefined
  }
 
  static async empty(key?: string): Promise<PrivateTree> {
    const keyStr = key ? key : await util.genKeyStr()
    return new PrivateTree([], keyStr)
  }

  static async fromCID(_cid: CID): Promise<Tree> {
    throw new Error("This is a private node. Use PrivateNode.fromCIDEncrypted")
  }

  static async fromCIDWithKey(cid: CID, keyStr: string): Promise<PrivateTree> {
    const content = await ipfs.catBuf(cid)
    const { key, links } = await util.decryptNode(content, keyStr)
    return new PrivateTree(links, key)
  }

  static async fromContent(content: FileContent, key?: string): Promise<Tree> {
    const keyStr = key ? key : await util.genKeyStr()
    const bytes = util.contentToBytes(content)
    const encrypted = await util.encrypt(bytes, keyStr)
    const cid = await ipfs.add(encrypted)
    const dir = await PrivateTree.empty(keyStr)
    return dir.addLink({ name: 'index', cid })
  }

  async put(): Promise<CID> {
    throw new Error("This is a private node. Use node.putEncrtyped")
  }

  async putEncrypted(key: string): Promise<CID> {
    const encrypted = await util.encryptNode(this.data(), key)
    return ipfs.add(encrypted)
  }

  async updateDirectChild(child: PrivateTree, name: string): Promise<Tree> {
    const cid = await child.putEncrypted(this.key)
    const link = { name, cid }
    return this.replaceLink(link)
  }

  async getDirectChild(name: string): Promise<Tree | null> {
    const link = this.findLink(name)
    return link ? this.static.fromCIDWithKey(link.cid, this.key) : null
  }

  data(): PrivateTreeData {
    return {
      key: this.key,
      links: this.links
    }
  }

  copyWithLinks(links: Link[]): Tree {
    return new PrivateTree(links, this.key)
  }

}

export default PrivateTree


// export async function empty(keyName: string) {
//   const ks = await keystore.get()
//   const key = await ks.exportSymmKey(keyName)
//   const root = await privNode.empty()
//   return new PrivateTree(root, key)
// }

// export async function resolve(cid: CID, keyName: string) {
//   const ks = await keystore.get()
//   const key = await ks.exportSymmKey(keyName)
//   const root = await privNode.resolve(cid, key)
//   return new PrivateTree(root, key)
// }

