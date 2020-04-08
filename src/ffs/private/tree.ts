import util from './util'
import link from '../link'
import { PrivateTreeData, Tree, Links, File, PrivateTreeStatic, PrivateFileStatic, FileSystemVersion } from '../types'
import { CID } from '../../ipfs'
import PublicTree from '../public/tree'
import PrivateFile from './file'
import resolver from './resolver'

export class PrivateTree extends PublicTree {

  private key: string
  static: {
    tree: PrivateTreeStatic
    file: PrivateFileStatic
  }

  constructor(links: Links, version: FileSystemVersion, key: string) {
    console.log("Version: ", version)
    super(links, version)
    this.key = key
    this.static = {
      tree: PrivateTree,
      file: PrivateFile
    }
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return obj.putEncrypted !== undefined
  }
 
  static async empty(version: FileSystemVersion = FileSystemVersion.v1_0_0, key?: string): Promise<PrivateTree> {
    const keyStr = key ? key : await util.genKeyStr()
    console.log('empty: ', version)
    return new PrivateTree({}, version, keyStr)
  }

  static async fromCID(_cid: CID): Promise<PublicTree> {
    throw new Error("This is a private node. Use PrivateNode.fromCIDEncrypted")
  }

  static async fromCIDWithKey(cid: CID, parentKey: string): Promise<PrivateTree> {
    const version = await resolver.getVersion(cid, parentKey)
    const { links, key } = await resolver.getTree(cid, parentKey)
    console.log("From cid with key: ", version)
    return new PrivateTree(links, version, key)
  }

  async put(): Promise<CID> {
    throw new Error("This is a private node. Use node.putEncrypted")
  }

  async putEncrypted(key: string): Promise<CID> {
    return resolver.putTree(this.version, this.data(), key)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string): Promise<Tree> {
    const cid = await child.putEncrypted(this.key)
    const isFile = util.isFile(child)
    return this.updateLink(link.make(name, cid, isFile))
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
    return new PrivateTree(links, this.version, this.key)
  }

}

export default PrivateTree
