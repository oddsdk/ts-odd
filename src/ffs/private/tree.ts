import util from './util'
import { PrivateTreeData, Tree, Links, PrivateTreeStatic } from '../types'
import ipfs, { CID, FileContent } from '../../ipfs'
import PublicTree from '../public/tree'

export class PrivateTree extends PublicTree {

  private key: string
  static: PrivateTreeStatic

  constructor(links: Links, key: string) {
    super(links)
    this.key = key
    this.static = PrivateTree
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return obj.putEncrypted !== undefined
  }
 
  static async empty(key?: string): Promise<PrivateTree> {
    const keyStr = key ? key : await util.genKeyStr()
    return new PrivateTree({}, keyStr)
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
    const encrypted = await util.encryptContent(content, keyStr)
    const cid = await ipfs.add(encrypted)
    const dir = await PrivateTree.empty(keyStr)
    return dir.addLink({ name: 'index', cid })
  }

  async put(): Promise<CID> {
    throw new Error("This is a private node. Use node.putEncrypted")
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

  async getOwnContent(): Promise<FileContent | null> {
    const link = this.findLink('index')
    if(link === null) {
      return null
    }
    const encrypted = await ipfs.catBuf(link.cid)
    return util.decryptContent(encrypted, this.key)
  }

  data(): PrivateTreeData {
    return {
      key: this.key,
      links: this.links
    }
  }

  copyWithLinks(links: Links): Tree {
    return new PrivateTree(links, this.key)
  }

}

export default PrivateTree
