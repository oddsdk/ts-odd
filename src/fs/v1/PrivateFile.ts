import PublicFile from './PublicFile'
import { CID, FileContent } from '../../ipfs'
import { SemVer, Header } from '../types'
import basic from '../network/basic'
import header from './header'

export class PrivateFile extends PublicFile {

  parentKey: string

  constructor(content: FileContent, header: Header, parentKey: string) {
    super(content, header)
    this.parentKey = parentKey
  }

  async put(): Promise<CID> {
    return this.putWithKey(this.parentKey)
  }

}

// CONSTRUCTORS

export const create = (content: FileContent, version: SemVer, parentKey: string): PrivateFile => {
  return new PrivateFile(content, { 
      ...header.empty(),
      version,
      isFile: true
    },
    parentKey
  )
}

export const fromCID = async (cid: CID, parentKey: string): Promise<PrivateFile> => {
  const info = await header.getHeaderAndIndex(cid, parentKey)
  const content = await basic.getFile(info.index, parentKey)
  return new PrivateFile(content, info.header, parentKey)
}

export const constructors = { create, fromCID }

export default PrivateFile
