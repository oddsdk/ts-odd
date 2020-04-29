import { File, SemVer } from '../types'
import { CID, FileContent } from '../../ipfs'
import normalizer from '../normalizer'
import semver from '../semver'


class PublicFile implements File {

  isFile = true
  content: FileContent
  version: SemVer

  constructor(content: FileContent, version: SemVer) {
    this.content = content
    this.version = version
  }

  static create(content: FileContent, version: SemVer = semver.latest): PublicFile {
    return new PublicFile(content, version)
  }

  static async fromCID(cid: CID): Promise<PublicFile> {
    const version = await normalizer.getVersion(cid)
    const content = await normalizer.getFile(cid)
    return new PublicFile(content, version)
  }

  put(): Promise<CID> {
    return normalizer.putFile(this.version, this.content)
  }

}


export default PublicFile
