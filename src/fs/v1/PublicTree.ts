import { Links, UpdateCallback } from '../types'
import { TreeInfo, TreeHeader, PutDetails } from '../protocol/public/types'
import * as check from '../types/check'
import { CID, FileContent } from '../../ipfs'
import BaseTree from '../base/tree'
import BareTree from '../bare/tree'
import PublicFile from './PublicFile'
import * as protocol from '../protocol'
import * as skeleton from '../protocol/public/skeleton'
import * as metadata from '../metadata'
import * as link from '../link'
import * as pathUtil from '../path'
import { Maybe } from '../../common'

type ConstructorParams = {
  links: Links
  header: TreeHeader
  cid: Maybe<CID>
}

type Child =
  PublicFile | PublicTree | BareTree

export class PublicTree extends BaseTree {

  links: Links
  header: TreeHeader
  cid: Maybe<CID>

  children: { [name: string]: Child }

  constructor({ links, header, cid }: ConstructorParams) {
    super(header.metadata.version)
    this.links = links
    this.header = header
    this.cid = cid
    this.children = {}
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
    const { userland, metadata, previous, skeleton } = info
    const links = await protocol.basic.getLinks(userland)
    return new PublicTree({
      links,
      header: { metadata, previous, skeleton },
      cid
    })
  }

  static instanceOf(obj: any): obj is PublicTree {
    return check.isLinks(obj.links) && check.isTreeHeader(obj.header)
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<PublicTree> {
    const child = await PublicTree.empty()

    const existing = this.children[name]
    if (existing) {
      if (PublicFile.instanceOf(existing)) {
        throw new Error(`There is a file at the given path: ${name}`)
      } else if (!PublicTree.instanceOf(existing)) {
        throw new Error(`Not a public tree at the given path: ${name}`)
      } else {
        return existing
      }
    }

    await this.updateDirectChild(child, name, onUpdate)
    return child
  }

  async createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<PublicFile> {
    const existing = await this.getDirectChild(name)
    let file: PublicFile
    if(existing === null){
      file = await PublicFile.create(content)
    } else if (PublicFile.instanceOf(existing)) {
      file = await existing.updateContent(content)
    }else {
      throw new Error(`There is already a directory with that name: ${name}`)
    }
    await this.updateDirectChild(file, name, onUpdate)
    return file
  }

  async putDetailed(): Promise<PutDetails> {
    const details = await protocol.pub.putTree(
      this.links,
      this.header.skeleton,
      this.header.metadata,
      this.cid
    )
    this.header.previous = this.cid || undefined
    this.cid = details.cid
    return details
  }

  async updateDirectChild(child: PublicTree | PublicFile, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    this.children[name] = child
    const details = await child.putDetailed()
    this.updateLink(name, details)
    onUpdate && await onUpdate()
    return this
  }

  removeDirectChild(name: string): this {
    delete this.links[name]
    delete this.header.skeleton[name]
    if(this.children[name]) {
      delete this.children[name]
    }
    return this
  }

  async getDirectChild(name: string): Promise<Child | null> {
    if(this.children[name]) {
      return this.children[name]
    }

    const childInfo = this.header.skeleton[name] || null
    if(childInfo === null) return null
    const child = childInfo.isFile
      ? await PublicFile.fromCID(childInfo.cid)
      : await PublicTree.fromCID(childInfo.cid)

    // check that the child wasn't added while retrieving the content from the network
    if(this.children[name]) {
      return this.children[name]
    }

    this.children[name] = child
    return child
  }

  async get(path: string): Promise<Child | null> {
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

  updateLink(name: string, result: PutDetails): this {
    const { cid, metadata, userland, size, isFile, skeleton } = result
    this.links[name] = link.make(name, cid, false, size)
    this.header.skeleton[name] = {
      cid,
      metadata,
      userland,
      subSkeleton: skeleton,
      isFile
    }
    this.header.metadata.unixMeta.mtime = Date.now()
    return this
  }
}


export default PublicTree
