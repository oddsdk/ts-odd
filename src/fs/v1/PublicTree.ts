import * as protocol from '../protocol'
import * as header from './header'
import { Links, HeaderTree, HeaderFile, PutDetails, SyncHookDetailed, Metadata, Skeleton, Children, IpfsSerialized } from '../types'
import * as check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import BaseTree from '../base/tree'
import PublicFile from './PublicFile'
import { Maybe } from '../../common'
import * as link from '../link'
import * as semver from '../semver'
import * as skeleton from '../skeleton'
import * as pathUtil from '../path'

export class PublicTree extends BaseTree implements HeaderTree {

  metadata: Metadata
  skeleton: Skeleton
  children: Children

  onUpdate: Maybe<SyncHookDetailed> = null

  constructor(links: Links, skeleton: Skeleton, children: Children, metadata: Metadata) {
    super(links, metadata.version)
    this.metadata = metadata
    this.skeleton = skeleton
    this.children = children
  }

  static async empty (): Promise<PublicTree> {
    return new PublicTree({}, {}, {}, {
      ...header.emptyMetadata(),
      version: semver.v1,
    })
  }

  static async fromCID (cid: CID): Promise<PublicTree> {
    const info = await header.getSerialized(cid)
    return PublicTree.fromSerialized(info)
  }

  static async fromSerialized(info: IpfsSerialized): Promise<PublicTree> {
    const { userland, metadata, skeleton, children } = info
    const links = await protocol.getLinks(userland)
    return new PublicTree(links, skeleton, children, metadata)
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.header !== undefined
  }

  async emptyChildTree(): Promise<HeaderTree> {
    return PublicTree.empty()
  }

  async createChildFile(content: FileContent): Promise<HeaderFile> {
    return PublicFile.create(content)
  }

  async putDetailed(): Promise<PutDetails> {
    const { cid, size } = await protocol.putLinks(this.links)
    const userlandLink = link.make('userland', cid, true, size)
    const details = await header.put(userlandLink, {
      metadata: {
        ...this.metadata,
        mtime: Date.now()
      },
      skeleton: this.skeleton,
      children: this.children,
    })
    if(this.onUpdate !== null){
      this.onUpdate(details)
    }
    return details
  }

  async updateDirectChild(child: HeaderTree | HeaderFile, name: string): Promise<this> {
    const { cid, metadata, userland, size } = await child.putDetailed()
    this.links[name] = link.make(name, cid, check.isFile(child), size)
    this.skeleton[name] = { cid, metadata, userland, children: check.isFile(child) ? {} : child.skeleton }
    this.children[name] = child.metadata
    return this
  }

  async removeDirectChild(name: string): Promise<this> {
    delete this.links[name]
    delete this.skeleton[name]
    delete this.children[name]
    return this
  }

  async getDirectChild(name: string): Promise<HeaderTree | HeaderFile | null> {
    const childCID = this.skeleton[name]?.cid || null
    const childInfo = this.children[name] || null
    if(childCID === null || childInfo === null) return null
    return childInfo.isFile
          ? PublicFile.fromCID(childCID)
          : PublicTree.fromCID(childCID)
  }

  async getOrCreateDirectChild(name: string): Promise<HeaderTree | HeaderFile> {
    const child = await this.getDirectChild(name)
    return child ? child : this.emptyChildTree()
  }

  async get(path: string): Promise<HeaderTree | HeaderFile | null> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null) return this

    const skeletonInfo = skeleton.getPath(this.skeleton, parts)
    if(skeletonInfo === null) return null

    const info = await header.getSerialized(skeletonInfo.cid)
    return info.metadata.isFile 
      ? PublicFile.fromSerialized(info)
      : PublicTree.fromSerialized(info)
  }

  getLinks(): Links {
    // add missing metadata into links
    return Object.values(this.links).reduce((acc, cur) => {
      return {
        ...acc,
        [cur.name]: {
          ...cur,
          mtime: this.children[cur.name]?.mtime,
          isFile: this.children[cur.name]?.isFile,
        }
      }
    }, {} as Links)
  }
}


export default PublicTree
