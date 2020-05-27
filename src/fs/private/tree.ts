import link from '../link'
import operations from '../operations'
import { PrivateTreeData, Tree, Links, File, PrivateTreeStatic, PrivateFileStatic, SemVer, PinMap, Header } from '../types'
import { CID } from '../../ipfs'
import keystore from '../../keystore'
import PublicTree from '../public/tree'
import PrivateFile from './file'
import normalizer from '../normalizer'
import semver from '../semver'
import { rmKeyFromObj, Maybe } from '../../common'


export class PrivateTree extends PublicTree {

  private key: string

  static: {
    tree: PrivateTreeStatic
    file: PrivateFileStatic
  }

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

  static async empty(version: SemVer = semver.latest, key?: string): Promise<PrivateTree> {
    const keyStr = key ? key : await keystore.genKeyStr()
    return new PrivateTree({}, keyStr, {
      version,
      cache: {}
    })
  }

  static async fromCID(_cid: CID): Promise<PublicTree> {
    throw new Error("This is a private node. Use PrivateNode.fromCIDEncrypted")
  }

  static async fromCIDWithKey(cid: CID, parentKey: string): Promise<PrivateTree> {
    const version = await normalizer.getVersion(cid, parentKey)
    const { links, key } = await normalizer.getPrivateTreeData(cid, parentKey)
    const pins = await normalizer.getPins(cid, parentKey)
    const cache = await normalizer.getCacheMap(cid, parentKey)
    return new PrivateTree(links, key, {
      version,
      pins,
      cache
    })
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
            .updateCache(name, cache)
            .updateLink(link.make(name, cid, isFile))
  }

  async removeDirectChild(name: string): Promise<Tree> {
    const link = this.findLink(name)
    return link === null
      ? this
      : this
          .updatePins(link.cid, null)
          .updateCache(name, null)
          .rmLink(name)
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const link = this.findLink(name)
    if (link === null) return null
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
