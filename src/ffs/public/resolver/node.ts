import dagPB from 'ipld-dag-pb'
import ipfs, { CID, FileContent, DAG_NODE_DATA } from '../../../ipfs'
import { BasicLinks, BasicLink, Link, Links, FileSystemVersion, Metadata } from '../../types'
import link from '../../link'
import { mapObjAsync } from '../../../common'
import util from './util'

class PublicNode_1_0_0 {

  cid: CID
  links: Links | null
  metadata: Metadata | null

  constructor(cid: CID) {
    this.cid = cid
    this.links = null
    this.metadata = null
  }

  static async getFile(cid: CID): Promise<FileContent> {
    const indexCID = await util.getLinkCID(cid, 'index')
    if(!indexCID) {
      throw new Error("File does not exist")
    }
    return util.getFile(indexCID)
  }

  async getDirectLinks(): Promise<Links> {
    if(this.links === null){
      this.links = await util.getLinks(this.cid)
    }
    return this.links
  }

  async getMetadata(): Promise<Metadata> {
    if(this.metadata === null){
      const links = await this.getDirectLinks()
      const [isFile, mtime] = await Promise.all([
        links['isFile']?.cid ? ipfs.encoded.getBool(links['isFile'].cid) : undefined,
        links['mtime']?.cid ? ipfs.encoded.getInt(links['mtime'].cid) : undefined
      ])
      this.metadata = {
        isFile,
        mtime
      }
    }
    return this.metadata
  }



}
