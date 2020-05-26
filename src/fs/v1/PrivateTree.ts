import { File, HeaderV1, PutResult } from '../types'
import { CID, FileContent } from '../../ipfs'
import * as keystore from '../../keystore'
import PublicTree  from './PublicTree'
import { constructors as PrivateFileConstructors } from './PrivateFile'
import header from './header'
import semver from '../semver'


export class PrivateTree extends PublicTree {

  private parentKey: string
  private ownKey: string

  constructor(header: HeaderV1, parentKey: string, ownKey: string) {
    super(header)

    this.parentKey = parentKey
    this.ownKey = ownKey
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return PublicTree.instanceOf(obj) && (obj as any).ownKey !== undefined
  }

  async createEmptyTree(key?: string): Promise<PrivateTree> {
    return constructors.empty(this.ownKey, key) // TODO: don't hardcode version
  }

  async createTreeFromCID(cid: CID): Promise<PrivateTree> {
    return constructors.fromCID(cid, this.ownKey)
  }

  createTreeFromHeader(header: HeaderV1): PrivateTree {
    return constructors.fromHeader(header, this.ownKey)
  }

  async createFile(content: FileContent): Promise<File> {
    return PrivateFileConstructors.create(content, this.ownKey) // TODO: don't hardcode version
  }

  async createFileFromCID(cid: CID): Promise<File> {
    return PrivateFileConstructors.fromCID(cid, this.ownKey)
  }

  async putWithPins(): Promise<PutResult> {
    return this.putWithKey(this.parentKey)
  }
}

// CONSTRUCTORS

export const empty = async (parentKey: string, ownKey?: string): Promise<PrivateTree> => {
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

export const fromCID = async (cid: CID, parentKey: string): Promise<PrivateTree> => {
  const info = await header.getHeaderAndIndex(cid, parentKey)
  if(info.header.key === null){
    throw new Error("This is not a private node: no key")
  }
 
  return new PrivateTree(info.header, parentKey, info.header.key)
}

export const fromHeader = (header: HeaderV1, parentKey: string): PrivateTree => {
  if(header.key === null){
    throw new Error("This is not a private node: no key")
  }
  return new PrivateTree(header, parentKey, header.key)
}

export const constructors = { empty, fromCID, fromHeader }


export default PrivateTree
