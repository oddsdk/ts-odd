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
  info: TreeHeader
}

export class PublicTree extends BaseTree {

  links: Links
  info: TreeHeader

  onUpdate: Maybe<SyncHookDetailed> = null

  constructor({ links, info }: ConstructorParams) {
    super(info.metadata.version)
    this.links = links
    this.info = info
  }

  static async empty (): Promise<PublicTree> {
    return new PublicTree({
      links: {},
      info: {
        metadata: metadata.empty(false),
        skeleton: {},
      }
    })
  }

  static async fromCID (cid: CID): Promise<PublicTree> {
    const info = await protocol.pub.get(cid)
    if(!check.isTreeInfo(info)) {
      throw new Error(`Could not parse a valid public tree at: ${cid}`)
    }
    return PublicTree.fromInfo(info)
  }

  static async fromInfo(info: TreeInfo): Promise<PublicTree> {
    const { userland, metadata, skeleton } = info
    const links = await protocol.basic.getLinks(userland)
    return new PublicTree({ links, info: { metadata, skeleton } })
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.header !== undefined
  }

  async emptyChildTree(): Promise<PublicTree> {
    return PublicTree.empty()
  }

  async createChildFile(content: FileContent, name: string): Promise<PublicFile> {
    if(this.links[name]?.isFile === false) {
      throw new Error(`There is already a directory with that name: ${name}`)
    }
    return PublicFile.create(content)
  }

  async putDetailed(): Promise<PutDetails> {
    const details = await protocol.pub.putTree(
      this.links, 
      this.info.skeleton,
      metadata.updateMtime(this.info.metadata)
    )
    if(this.onUpdate !== null){
      this.onUpdate(details)
    }
    return details
  }

  async updateDirectChild(child: PublicTree | PublicFile, name: string): Promise<this> {
    const { cid, metadata, userland, size } = await child.putDetailed()
    this.links[name] = link.make(name, cid, check.isFile(child), size)
    this.info.skeleton[name] = { 
      cid, 
      metadata, 
      userland, 
      subSkeleton: check.isFile(child) ? {} : child.info.skeleton,
      isFile: check.isFile(child)
    }
    return this
  }

  removeDirectChild(name: string): this {
    delete this.links[name]
    delete this.info.skeleton[name]
    return this
  }

  async getDirectChild(name: string): Promise<PublicTree | PublicFile | null> {
    const childInfo = this.info.skeleton[name] || null
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

    const skeletonInfo = skeleton.getPath(this.info.skeleton, parts)
    if(skeletonInfo === null) return null

    const info = await protocol.pub.get(skeletonInfo.cid)
    return check.isFileInfo(info) 
      ? PublicFile.fromInfo(info)
      : PublicTree.fromInfo(info)
  }

  getLinks(): Links {
    // add missing metadata into links
    return Object.values(this.links).reduce((acc, cur) => {
      return {
        ...acc,
        [cur.name]: {
          ...cur,
          isFile: this.info.skeleton[cur.name]?.isFile,
        }
      }
    }, {} as Links)
  }
}


export default PublicTree
