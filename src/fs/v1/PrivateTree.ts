import { HeaderV1, Tree } from '../types'
import { CID } from '../../ipfs'
import * as keystore from '../../keystore'
import PublicTree  from './PublicTree'
import PrivateFile from './PrivateFile'
import header from './header'
import semver from '../semver'


export class PrivateTree extends PublicTree {

  protected parentKey: string
  protected ownKey: string

  constructor(header: HeaderV1, parentKey: string, ownKey: string) {
    super(header, parentKey)
    this.parentKey = parentKey
    this.ownKey = ownKey
    this.static = {
      tree: PrivateTree,
      file: PrivateFile
    }
  }

  static async empty (parentKey: string, ownKey?: string): Promise<Tree> {
    const keyStr = ownKey ? ownKey : await keystore.genKeyStr()
    return new PrivateTree({
        ...header.empty(),
        key: keyStr,
        version: semver.v1,
      }, 
      parentKey,
      keyStr
    )
  }

  static async fromCID (cid: CID, parentKey: string): Promise<Tree> {
    const info = await header.getHeaderAndIndex(cid, parentKey)
    return info.header.key === null
      ? super.fromCID(cid, parentKey)
      : new PrivateTree(info.header, parentKey, info.header.key)
  }

  static fromHeader (header: HeaderV1, parentKey: string): Tree {
    return header.key === null
      ? super.fromHeader(header, parentKey)
      : new PrivateTree(header, parentKey, header.key)
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return PublicTree.instanceOf(obj) && (obj as any).ownKey !== null
  }

}

export default PrivateTree
