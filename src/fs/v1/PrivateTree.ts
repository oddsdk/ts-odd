import { Links, HeaderV1, HeaderTree } from '../types'
import { CID } from '../../ipfs'
import * as keystore from '../../keystore'
import PublicTree  from './PublicTree'
import PrivateFile from './PrivateFile'
import * as header from './header'
import * as protocol from '../protocol'
import * as semver from '../semver'


export class PrivateTree extends PublicTree {

  parentKey: string
  protected ownKey: string

  constructor(links: Links, header: HeaderV1, parentKey: string, ownKey: string) {
    super(links, header, parentKey)
    this.parentKey = parentKey
    this.ownKey = ownKey
    this.static = {
      tree: PrivateTree,
      file: PrivateFile
    }
  }

  static async empty (parentKey: string, ownKey?: string): Promise<HeaderTree> {
    const keyStr = ownKey ? ownKey : await keystore.genKeyStr()
    return new PrivateTree({}, {
        ...header.empty(),
        key: keyStr,
        version: semver.v1,
      }, 
      parentKey,
      keyStr
    )
  }

  static async fromCID (cid: CID, parentKey: string): Promise<HeaderTree> {
    const info = await header.getHeaderAndUserland(cid, parentKey)
    return PrivateTree.fromHeaderAndUserland(info.header, info.userland, parentKey)
  }

  static async fromHeaderAndUserland(header: HeaderV1, userland: CID, parentKey: string): Promise<HeaderTree> {
    const links = await protocol.getLinks(userland, header.key)
    return header.key === null
      ? super.fromHeaderAndUserland(header, userland, parentKey)
      : new PrivateTree(links, header, parentKey, header.key)
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return PublicTree.instanceOf(obj) && (obj as any).ownKey !== null
  }

}

export default PrivateTree
