import PublicFile from '../public/file'
import { CID, FileContent } from '../../ipfs'
import { SemVer, Header } from '../types'
import normalizer from '../normalizer'
import header from '../header'

export class PrivateFile extends PublicFile {

  parentKey: string

  constructor(content: FileContent, header: Header, parentKey: string) {
    super(content, header)
    this.parentKey = parentKey
  }

  async put(): Promise<CID> {
    return normalizer.putFile(this.content, this.header, this.parentKey)
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
  const content = await normalizer.getFile(cid, parentKey)
  const header = await normalizer.getHeader(cid, parentKey)
  return new PrivateFile(content, header, parentKey)
}

export const constructors = { create, fromCID }

export default PrivateFile
