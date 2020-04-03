import util from './util'
import link from '../link'
import { PrivateTreeData, Tree, Links, File, PrivateTreeStatic, PrivateFileStatic } from '../types'
import ipfs, { CID } from '../../ipfs'
import PublicTree from '../public/tree'
import PrivateFile from './file'

export class PrivateTree extends PublicTree {

  private key: string
  static: {
    tree: PrivateTreeStatic
    file: PrivateFileStatic
  }

  constructor(links: Links, key: string) {
    super(links)
    this.key = key
    this.static = {
      tree: PrivateTree,
      file: PrivateFile
    }
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return obj.putEncrypted !== undefined
  }
 
  static async empty(key?: string): Promise<PrivateTree> {
    const keyStr = key ? key : await util.genKeyStr()
    return new PrivateTree({}, keyStr)
  }

  static async fromCID(_cid: CID): Promise<PublicTree> {
    throw new Error("This is a private node. Use PrivateNode.fromCIDEncrypted")
  }

  static async fromCIDWithKey(cid: CID, keyStr: string): Promise<PrivateTree> {
    const content = await ipfs.catBuf(cid)
    const { key, links } = await util.decryptNode(content, keyStr)
    return new PrivateTree(links, key)
  }

  async put(): Promise<CID> {
    throw new Error("This is a private node. Use node.putEncrypted")
  }

  async putEncrypted(key: string): Promise<CID> {
    const encrypted = await util.encryptNode(this.data(), key)
    return ipfs.add(encrypted)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string): Promise<Tree> {
    try{
      const cid = await child.putEncrypted(this.key)
      const isFile = util.isFile(child)
      return this.updateLink(link.make(name, cid, isFile))
    }catch(err){
      console.log(child)
      throw err
    }
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const link = this.findLink(name)
    if(link === null) {
      return null
    }
    return link.isFile
            ? this.static.file.fromCIDWithKey(link.cid, this.key)
            : this.static.tree.fromCIDWithKey(link.cid, this.key)
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
