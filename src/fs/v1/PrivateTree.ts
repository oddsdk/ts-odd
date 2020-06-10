import { Tree, File, SemVer, Header } from '../types'
import { CID, FileContent } from '../../ipfs'
import keystore from '../../keystore'
import PublicTree  from './PublicTree'
import { constructors as PrivateFileConstructors } from './PrivateFile'
import header from './header'
import semver from '../semver'


export class PrivateTree extends PublicTree {

  private parentKey: string
  private ownKey: string

  constructor(header: Header, parentKey: string, ownKey: string) {
    super(header)

    this.parentKey = parentKey
    this.ownKey = ownKey
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return PublicTree.instanceOf(obj) && (obj as any).ownKey !== undefined
  }

  async createEmptyTree(key?: string): Promise<PrivateTree> {
    return constructors.empty(semver.latest, this.ownKey, key) // TODO: don't hardcode version
  }

  async createTreeFromCID(cid: CID): Promise<PrivateTree> {
    return constructors.fromCID(cid, this.ownKey)
  }

  createFile(content: FileContent): File {
    return PrivateFileConstructors.create(content, semver.latest, this.ownKey) // TODO: don't hardcode version
  }

  async createFileFromCID(cid: CID): Promise<File> {
    return PrivateFileConstructors.fromCID(cid, this.ownKey)
  }

  async put(): Promise<CID> {
    return this.putWithKey(this.parentKey)
  }

  async getDirectChild(name: string): Promise<Tree | File | null> {
    const childHeader = this.findLink(name)
    if(childHeader === null) return null
    return childHeader.isFile
          ? PrivateFileConstructors.fromCID(childHeader.cid, this.ownKey)
          : constructors.fromHeader(childHeader, this.ownKey)
  }

  copyWithHeader(header: Header): Tree {
    return new PrivateTree(header, this.parentKey, this.ownKey)
  }

}

// CONSTRUCTORS

export const empty = async (version: SemVer, parentKey: string, ownKey?: string): Promise<PrivateTree> => {
  const keyStr = ownKey ? ownKey : await keystore.genKeyStr()
  return new PrivateTree({
    ...header.empty(),
    key: keyStr,
    version,
  }, 
  parentKey,
  keyStr
  )
}

export const fromCID = async (cid: CID, parentKey: string): Promise<PrivateTree> => {
  const info = await header.getHeaderAndIndex(cid, null)
  if(info.header.key === null){
    throw new Error("This is not a private node: no key")
  }
 
  return new PrivateTree(info.header, parentKey, info.header.key)
}

export const fromHeader = async (header: Header, parentKey: string): Promise<PrivateTree> => {
  if(header.key === null){
    throw new Error("This is not a private node: no key")
  }
  return new PrivateTree(header, parentKey, header.key)
}

export const constructors = { empty, fromCID, fromHeader }


export default PrivateTree
