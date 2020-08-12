import * as protocol from '../protocol'
import * as header from './header'
import { Links, HeaderV1, StaticMethods, HeaderTree, HeaderFile, PutDetails, SyncHookDetailed } from '../types'
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

  protected header: HeaderV1
  onUpdate: Maybe<SyncHookDetailed> = null

  protected static: StaticMethods

  constructor(links: Links, header: HeaderV1) {
    super(links, header.version)
    this.header = header
    this.static = {
      tree: PublicTree,
      file: PublicFile
    }
  }

  static async empty (): Promise<PublicTree> {
    return new PublicTree({}, {
      ...header.empty(),
      version: semver.v1,
    })
  }

  static async fromCID (cid: CID): Promise<PublicTree> {
    const info = await header.getHeaderAndUserland(cid)
    return PublicTree.fromHeaderAndUserland(info.header, info.userland)
  }

  static async fromHeaderAndUserland(header: HeaderV1, userland: CID): Promise<PublicTree> {
    const links = await protocol.getLinks(userland, null)
    return new PublicTree(links, header)
  }

  static instanceOf(obj: any): obj is PublicTree {
    return obj.header !== undefined
  }

  async emptyChildTree(): Promise<HeaderTree> {
    return this.static.tree.empty()
  }

  async createChildFile(content: FileContent): Promise<HeaderFile> {
    return this.static.file.create(content)
  }

  async putDetailed(): Promise<PutDetails> {
    const { cid, size } = await protocol.putLinks(this.links, null)
    const userlandLink = link.make('userland', cid, true, size)
    const details = await header.put(userlandLink, {
      ...this.header,
      mtime: Date.now()
    })
    if(this.onUpdate !== null){
      this.onUpdate(details)
    }
    return details
  }
 

  async updateDirectChild(child: HeaderTree | HeaderFile, name: string): Promise<this> {
    const { cid, metadata, userland, size } = await child.putDetailed()
    const childHeader = child.getHeader()
    this.links[name] = link.make(name, cid, check.isFile(child), size)
    this.header.skeleton[name] = { cid, metadata, userland, children: childHeader.skeleton }
    this.header.children[name] = header.toMetadata(childHeader)
    return this
  }

  async removeDirectChild(name: string): Promise<this> {
    delete this.links[name]
    delete this.header.skeleton[name]
    return this
  }

  async getDirectChild(name: string): Promise<HeaderTree | HeaderFile | null> {
    const childCID = this.header.skeleton[name]?.cid || null
    const childInfo = this.header.children[name] || null
    if(childCID === null || childInfo === null) return null
    return childInfo.isFile
          ? this.static.file.fromCID(childCID)
          : this.static.tree.fromCID(childCID)
  }

  async getOrCreateDirectChild(name: string): Promise<HeaderTree | HeaderFile> {
    const child = await this.getDirectChild(name)
    return child ? child : this.emptyChildTree()
  }

  async get(path: string): Promise<HeaderTree | HeaderFile | null> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null) return this

    const skeletonInfo = skeleton.getPath(this.header.skeleton, parts)
    if(skeletonInfo === null) return null

    const info = await header.getHeaderAndUserland(skeletonInfo.cid)
    return info.header.isFile 
      ? this.static.file.fromHeaderAndUserland(info.header, info.userland)
      : this.static.tree.fromHeaderAndUserland(info.header, info.userland)
  }

  getLinks(): Links {
    // add missing metadata into links
    return Object.values(this.links).reduce((acc, cur) => {
      return {
        ...acc,
        [cur.name]: {
          ...cur,
          mtime: this.header.children[cur.name]?.mtime,
          isFile: this.header.children[cur.name]?.isFile,
        }
      }
    }, {} as Links)
  }

  getHeader(): HeaderV1 {
    return this.header
  }

}


export default PublicTree
