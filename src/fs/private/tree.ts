import link from '../link'
import operations from '../operations'
import { PrivateTreeData, Tree, Links, File, SemVer, Header } from '../types'
import check from '../types/check'
import { CID } from '../../ipfs'
import keystore from '../../keystore'
import PublicTree from '../public/tree'
import PrivateFile from './file'
import normalizer from '../normalizer'
import header from '../header'


export class PrivateTree extends PublicTree {

  private key: string

  protected constructor(header: Header, key: string) {
    super(header)

    this.key = key

    this.static = {
      tree: PrivateTree,
      file: PrivateFile
    }
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return obj.putEncrypted !== undefined
  }

  static async empty(version: SemVer, key?: string): Promise<PrivateTree> {
    const keyStr = key ? key : await keystore.genKeyStr()
    return new PrivateTree({
      ...header.empty(),
      key: keyStr,
      version,
    }, keyStr)
  }

  static async fromCID(cid: CID, parentKey?: string): Promise<PrivateTree> {
    if(parentKey === undefined) {
      throw new Error("This is a private node. Use PrivateNode.fromCIDEncrypted")
    }
    const header = await normalizer.getHeader(cid, parentKey)
    if(header.key === null){
      throw new Error("This is not a private node")
    }
   
    return new PrivateTree(header, header.key)
  }

  async put(): Promise<CID> {
    throw new Error("This is a private node. Use node.putEncrypted")
  }

  async putEncrypted(key: string): Promise<CID> {
    return normalizer.putTree(this.header, key)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string): Promise<Tree> {
    const cid = await child.putEncrypted(this.key)
    // const [ isFile, pinList ] = operations.isFile(child) ? [true, [], ] : [false, child.pinList()]
    // const isFile = await check.isFile(child)
    // const header = await normalizer.getHeader(cid, this.key)
    // const cache = {
    //   ...header,
    //   cid
    // }
    console.log("HERE")
    return this.updateHeader(name, {
      ...child.getHeader(),
      cid
    })
  }

  // async removeDirectChild(name: string): Promise<Tree> {
  //   const link = this.findLink(name)
  //   return link === null
  //     ? this
  //     : this
  //         // .updatePins(link.cid, null)
  //         .updateHeader(name, null)
  //         .rmLink(name)
  //   return this.updateHeader()
  // }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const link = this.findLink(name)
    if (link === null) return null
    return link.isFile
            ? this.static.file.fromCID(link.cid, this.key)
            : this.static.tree.fromCID(link.cid, this.key)
  }

  copyWithHeader(header: Header): Tree {
    return new PrivateTree(header, this.key)
  }

}

export default PrivateTree
