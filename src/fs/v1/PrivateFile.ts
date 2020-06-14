import PublicFile from './PublicFile'
import { CID, FileContent } from '../../ipfs'
import { HeaderV1, PutResult, HeaderFile } from '../types'
import * as keystore from '../../keystore'
import basic from '../network/basic'
import header from './header'
import semver from '../semver'

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
    const info = await header.getHeaderAndIndex(cid, parentKey)
    const content = await basic.getEncodedFile(info.index, info.header.key)
    return new PrivateFile(content, info.header, parentKey)
  }

  async putWithPins(): Promise<PutResult> {
    return this.putWithKey(this.parentKey)
  }

}


export default PrivateFile
