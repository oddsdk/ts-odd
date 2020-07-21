import PublicFile from './PublicFile'
import { CID, FileContent } from '../../ipfs'
import { HeaderV1, HeaderFile, PutDetails } from '../types'
import * as keystore from '../../keystore'
import * as protocol from '../protocol'
import * as header from './header'
import * as semver from '../semver'

export class PrivateFile extends PublicFile {

  parentKey: string

  constructor(content: FileContent, header: HeaderV1, parentKey: string) {
    super(content, header, parentKey)
    this.parentKey = parentKey
  }

  static async create(content: FileContent, parentKey: string, ownKey?: string): Promise<HeaderFile>{
    const keyStr = ownKey ? ownKey : await keystore.genKeyStr()
    return new PrivateFile(content, { 
        ...header.empty(),
        key: keyStr,
        version: semver.v1,
        isFile: true
      },
      parentKey
    )
  }

  static async fromCID(cid: CID, parentKey: string): Promise<HeaderFile>{
    const info = await header.getHeaderAndUserland(cid, parentKey)
    return PrivateFile.fromHeaderAndUserland(info.header, info.userland, parentKey)
  }

  static async fromHeaderAndUserland(header: HeaderV1, userland: CID, parentKey: string): Promise<HeaderFile> {
    const content = await protocol.getFile(userland, header.key)
    return new PublicFile(content, header, parentKey)
  }

  async putDetailed(): Promise<PutDetails> {
    return this.putWithKey(this.parentKey)
  }

}


export default PrivateFile
