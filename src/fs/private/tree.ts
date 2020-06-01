import link from '../link'
import operations from '../operations'
import { PrivateTreeData, Tree, Links, File, SemVer, Header } from '../types'
import { CID } from '../../ipfs'
import keystore from '../../keystore'
import PublicTree from '../public/tree'
import PrivateFile from './file'
import normalizer from '../normalizer'
import header from '../header'
import { rmKeyFromObj, Maybe } from '../../common'


export class PrivateTree extends PublicTree {

  private key: string

  protected constructor(links: Links, key: string, header: Header) {
    super(links, header)

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
    return new PrivateTree({}, keyStr, {
      ...header.empty(),
      version,
    })
  }

  static async fromCID(cid: CID, parentKey?: string): Promise<PrivateTree> {
    if(parentKey === undefined) {
      throw new Error("This is a private node. Use PrivateNode.fromCIDEncrypted")
    }
    const { links, key } = await normalizer.getPrivateTreeData(cid, parentKey)
    const header = await normalizer.getHeader(cid, parentKey)
    return new PrivateTree(links, key, header)
  }

  async put(): Promise<CID> {
    throw new Error("This is a private node. Use node.putEncrypted")
  }

  async putEncrypted(key: string): Promise<CID> {
    return normalizer.putTree(this.header.version, this.data(), key, this.header)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string): Promise<Tree> {
    const cid = await child.putEncrypted(this.key)
    const [ isFile, pinList ] = operations.isFile(child) ? [true, [], ] : [false, child.pinList()]
    const header = await normalizer.getHeader(cid, this.key)
    const cache = {
      ...header,
      cid
    }
    return this
            .updatePins(cid, pinList)
            .updateHeader(name, cache)
            .updateLink(link.make(name, cid, isFile))
  }

  async removeDirectChild(name: string): Promise<Tree> {
    const link = this.findLink(name)
    return link === null
      ? this
      : this
          .updatePins(link.cid, null)
          .updateHeader(name, null)
          .rmLink(name)
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const link = this.findLink(name)
    if (link === null) return null
    return link.isFile
            ? this.static.file.fromCID(link.cid, this.key)
            : this.static.tree.fromCID(link.cid, this.key)
  }

  data(): PrivateTreeData {
    return {
      key: this.key,
      links: this.links
    }
  }

  private updatePins(cid: CID, childPins: Maybe<CID[]>): Tree {
    const pins = this.header.pins || {}
    const updated = childPins === null
      ? rmKeyFromObj(pins, cid)
      : {
        ...pins,
        [cid]: childPins
      }
    return new PrivateTree(this.links, this.key, {
      ...this.header,
      pins: updated
    })
  }

  pinList(): CID[] {
    return Object.entries(this.header.pins || {}).reduce((acc, cur) => {
      const [parent, children] = cur
      return [
        ...acc,
        ...children,
        parent
      ]
    }, [] as CID[])
  }

  copyWithLinks(links: Links): Tree {
    return new PrivateTree(links, this.key, this.header)
  }

  copyWithHeader(header: Header): Tree {
    return new PrivateTree(this.links, this.key, header)
  }

}

export default PrivateTree
