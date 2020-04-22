import link from '../link'
import util from '../util'
import { PrivateTreeData, Tree, Links, File, PrivateTreeStatic, PrivateFileStatic, SemVer } from '../types'
import { CID } from '../../ipfs'
import keystore from '../../keystore'
import PublicTree from '../public/tree'
import PrivateFile from './file'
import normalizer from '../normalizer'
import semver from '../semver'

type PinMap = {
  [cid: string]: CID[]
}

export class PrivateTree extends PublicTree {

  pinMap: PinMap
  private key: string
  static: {
    tree: PrivateTreeStatic
    file: PrivateFileStatic
  }

  constructor(links: Links, version: SemVer, key: string, pinMap: PinMap) {
    super(links, version)
    this.key = key
    this.pinMap = pinMap
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
    return new PrivateTree({}, version, keyStr, {})
  }

  static async fromCID(_cid: CID): Promise<PublicTree> {
    throw new Error("This is a private node. Use PrivateNode.fromCIDEncrypted")
  }

  static async fromCIDWithKey(cid: CID, parentKey: string): Promise<PrivateTree> {
    const version = await normalizer.getVersion(cid, parentKey)
    const { links, key } = await normalizer.getPrivateTreeData(cid, parentKey)
    const pinMap = await normalizer.getPins(cid, parentKey)
    return new PrivateTree(links, version, key, pinMap)
  }

  async put(): Promise<CID> {
    throw new Error("This is a private node. Use node.putEncrypted")
  }

  async putEncrypted(key: string): Promise<CID> {
    return normalizer.putTree(this.version, this.data(), { pins: this.pinMap }, key)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string): Promise<Tree> {
    const cid = await child.putEncrypted(this.key)
    const [ isFile, pinList ] = util.isFile(child) ? [true, []] : [false, child.pinList()]
    return this
            .updatePinMap(cid, pinList)
            .updateLink(link.make(name, cid, isFile))
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

  updatePinMap(key: string, pinList: CID[]): Tree {
    return new PrivateTree(this.links, this.version, this.key, {
      ...this.pinMap,
      [key]: pinList
    })
  }

  copyWithLinks(links: Links): Tree {
    return new PrivateTree(links, this.version, this.key, this.pinMap)
  }

  pinList(): CID[] {
    return Object.entries(this.pinMap).reduce((acc, cur) => {
      const [parent, children] = cur
      return [
        ...acc,
        ...children,
        parent
      ]
    }, [] as CID[])
  }

}

export default PrivateTree
