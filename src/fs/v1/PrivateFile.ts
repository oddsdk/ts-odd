import PublicFile from './PublicFile'
import { CID, FileContent } from '../../ipfs'
import { HeaderV1, PutResult } from '../types'
import * as keystore from '../../keystore'
import basic from '../network/basic'
import header from './header'
import semver from '../semver'

export class PrivateFile extends PublicFile {

  parentKey: string

  constructor(content: FileContent, header: HeaderV1, parentKey: string) {
    super(content, header)
    this.parentKey = parentKey
  }

  async putWithPins(): Promise<PutResult> {
    return this.putWithKey(this.parentKey)
  }

}

// CONSTRUCTORS

export const create = async (content: FileContent, parentKey: string, ownKey?: string): Promise<PrivateFile> => {
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

export const fromCID = async (cid: CID, parentKey: string): Promise<PrivateFile> => {
  const info = await header.getHeaderAndIndex(cid, parentKey)
  const content = await basic.getFile(info.index, info.header.key)
  return new PrivateFile(content, info.header, parentKey)
}

export const constructors = { create, fromCID }

export default PrivateFile
