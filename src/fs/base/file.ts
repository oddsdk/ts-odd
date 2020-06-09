import { SimpleFile } from '../types'
import { CID, FileContent } from '../../ipfs'


export abstract class BaseFile implements SimpleFile {

  content: FileContent

  constructor(content: FileContent) {
    this.content = content
  }

  abstract async put(): Promise<CID>
}

export default BaseFile
