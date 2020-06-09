import { Tree, File, SemVer, Header } from '../types'
import ipfs, { CID, FileContent } from '../../ipfs'
import keystore from '../../keystore'
import PublicTree  from '../public/tree'
import PrivateFile, { constructors as PrivateFileConstructors } from './file'
import normalizer from '../normalizer'
import header from '../header'
import semver from '../semver'
import check from '../types/check'


export class PrivateTree extends PublicTree {

  private parentKey: string
  private ownKey: string

  constructor(header: Header, parentKey: string, ownKey: string) {
    super(header)

    this.parentKey = parentKey
    this.ownKey = ownKey
  }

  // static instanceOf(obj: any): obj is PrivateTree {
  //   return obj.putEncrypted !== undefined
  // }

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
    return normalizer.putTree(this.header, this.parentKey)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string): Promise<Tree> {
    const cid = await child.put()
    const content = await ipfs.encoded.catAndDecode(cid, this.ownKey)
    return this.updateHeader(name, {
      ...child.getHeader(),
      cid,
      isFile: check.isFile(child)
    })
  }

  copyWithHeader(header: Header): Tree {
    return new PrivateTree(header, this.parentKey, this.ownKey)
  }

}

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
  const header = await normalizer.getHeader(cid, parentKey)
  if(header.key === null){
    throw new Error("This is not a private node: no key")
  }
 
  return new PrivateTree(header, parentKey, header.key)
}

export const fromHeader = async (header: Header, parentKey: string): Promise<PrivateTree> => {
  if(header.key === null){
    throw new Error("This is not a private node: no key")
  }
  return new PrivateTree(header, parentKey, header.key)
}

export const constructors = { empty, fromCID, fromHeader }


export default PrivateTree
