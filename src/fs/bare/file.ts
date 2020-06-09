import { CID, FileContent } from '../../ipfs'
import basic from '../normalizer/basic'
import BaseFile from '../base/file'


export class BareFile extends BaseFile {
  async put(): Promise<CID> {
    const { cid } = await  basic.putFile(this.content, null)
    return cid
  }
}

// CONSTRUCTORS

export const create = (content: FileContent): BareFile => {
  return new BareFile(content)
}

export const fromCID = async (cid: CID): Promise<BareFile> => {
  const content = await basic.getFile(cid, null)
  return new BareFile(content)
}

export const constructors = { create, fromCID }

export default {
  BareFile,
  constructors,
  create,
  fromCID
}

