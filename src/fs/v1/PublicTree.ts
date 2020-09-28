import { Links, PutDetails, SyncHookDetailed } from '../types'
import { TreeInfo, TreeHeader } from '../protocol/public/types'
import * as check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import BaseTree from '../base/tree'
import PublicFile from './PublicFile'
import { Maybe } from '../../common'
import * as protocol from '../protocol'
import * as skeleton from '../protocol/public/skeleton'
import * as metadata from '../metadata'
import * as link from '../link'
import * as pathUtil from '../path'

type ConstructorParams = {
  links: Links
  header: TreeHeader
  cid: Maybe<CID>
}

export class PublicTree extends BaseTree {

  links: Links
  header: TreeHeader
  cid: Maybe<CID>

  onUpdate: Maybe<SyncHookDetailed> = null

  constructor({ links, header, cid }: ConstructorParams) {
    super(header.metadata.version)
    this.links = links
    this.header = header
    this.cid = cid
  }

  static async empty (): Promise<PublicTree> {
    return new PublicTree({
      links: {},
      header: {
        metadata: metadata.empty(false),
        skeleton: {},
      },
      cid: null
    })
  }

  static async fromCID (cid: CID): Promise<PublicTree> {
    const info = await protocol.pub.get(cid)
    if(!check.isTreeInfo(info)) {
      throw new Error(`Could not parse a valid public tree at: ${cid}`)
    }
    return PublicTree.fromInfo(info, cid)
  }

  static async fromInfo(info: TreeInfo, cid: CID): Promise<PublicTree> {
    const { userland, metadata, skeleton } = info
    const links = await protocol.basic.getLinks(userland)
    return new PublicTree({ 
      links, 
      header: { metadata, skeleton },
      cid
    })
  }

  static instanceOf(obj: any): obj is PublicTree {
    return check.isLinks(obj.links) && check.isTreeHeader(obj.header)
  }

  async emptyChildTree(): Promise<PublicTree> {
    return PublicTree.empty()
  }

  async createChildFile(content: FileContent, name: string): Promise<PublicFile> {
    const existing = await this.getDirectChild(name)
    if(existing === null){
      return PublicFile.create(content)
    }else if (PublicFile.instanceOf(existing)) {
      return existing.updateContent(content)
    } else {
      throw new Error(`There is already a directory with that name: ${name}`)
    }
  }

  async putDetailed(): Promise<PutDetails> {
    const details = await protocol.pub.putTree(
      this.links, 
      this.header.skeleton,
      metadata.updateMtime(this.header.metadata),
      this.cid
    )
    this.cid = details.cid
    if(this.onUpdate !== null){
      this.onUpdate(details)
    }
    return details
  }

  async updateDirectChild(child: PublicTree | PublicFile, name: string): Promise<this> {
    const { cid, metadata, userland, size } = await child.putDetailed()
    this.links[name] = link.make(name, cid, check.isFile(child), size)
    this.header.skeleton[name] = { 
      cid, 
      metadata, 
      userland, 
      subSkeleton: check.isFile(child) ? {} : child.header.skeleton,
      isFile: check.isFile(child)
    }
    return this
  }

  removeDirectChild(name: string): this {
    delete this.links[name]
    delete this.header.skeleton[name]
    return this
  }

  async getDirectChild(name: string): Promise<PublicTree | PublicFile | null> {
    const childInfo = this.header.skeleton[name] || null
    if(childInfo === null) return null
    return childInfo.isFile
          ? PublicFile.fromCID(childInfo.cid)
          : PublicTree.fromCID(childInfo.cid)
  }

  async getOrCreateDirectChild(name: string): Promise<PublicTree | PublicFile> {
    const child = await this.getDirectChild(name)
    return child ? child : this.emptyChildTree()
  }

  async get(path: string): Promise<PublicTree | PublicFile | null> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null) return this

    const skeletonInfo = skeleton.getPath(this.header.skeleton, parts)
    if(skeletonInfo === null) return null

    const info = await protocol.pub.get(skeletonInfo.cid)
    return check.isFileInfo(info) 
      ? PublicFile.fromInfo(info, skeletonInfo.cid)
      : PublicTree.fromInfo(info, skeletonInfo.cid)
  }

  getLinks(): Links {
    // add missing metadata into links
    return Object.values(this.links).reduce((acc, cur) => {
      return {
        ...acc,
        [cur.name]: {
          ...cur,
          isFile: this.header.skeleton[cur.name]?.isFile,
        }
      }
    }, {} as Links)
  }
}


export default PublicTree
