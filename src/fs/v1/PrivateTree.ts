import { FileContent } from '../../ipfs'
import MMPT from '../protocol/private/mmpt'
import PrivateFile from './PrivateFile'
import { DecryptedNode, PrivateSkeletonInfo, PrivateTreeInfo, PrivateAddResult } from '../protocol/private/types'
import * as protocol from '../protocol'
import * as check from '../protocol/private/types/check'
import * as pathUtil from '../path'
import * as metadata from '../metadata'
import * as semver from '../semver'
import * as namefilter from '../protocol/private/namefilter'
import { PrivateName, BareNameFilter } from '../protocol/private/namefilter'
import { isObject, mapObj, Maybe, removeKeyFromObj } from '../../common'
import { BaseLinks, UpdateCallback } from '../types'
import BaseTree from '../base/tree'
import { genKeyStr } from '../../keystore'

type ConstructorParams = {
  mmpt: MMPT
  key: string
  info: PrivateTreeInfo
}

export default class PrivateTree extends BaseTree {

  mmpt: MMPT
  key: string
  info: PrivateTreeInfo

  children: { [name: string]: PrivateTree | PrivateFile }

  constructor({ mmpt, key, info}: ConstructorParams) {
    super(semver.v1)
    this.mmpt = mmpt
    this.key = key
    this.info = info
    this.children = {}
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return isObject(obj) 
      && obj.mmpt !== undefined 
      && check.isPrivateTreeInfo(obj.info)
  }

  static async create(mmpt: MMPT, key: string, parentNameFilter: Maybe<BareNameFilter>): Promise<PrivateTree> {
    const bareNameFilter = parentNameFilter 
      ? await namefilter.addToBare(parentNameFilter, key)
      : await namefilter.createBare(key)
    return new PrivateTree({
      mmpt,
      key,
      info: {
        metadata: metadata.empty(false),
        bareNameFilter,
        revision: 1,
        links: {},
        skeleton: {},
      }
    })
  }

  static async fromBaseKey(mmpt: MMPT, key: string): Promise<PrivateTree> {
    const bareNameFilter = await namefilter.createBare(key)
    const revisionFilter = await namefilter.addRevision(bareNameFilter, key, 1)
    const name = await namefilter.toPrivateName(revisionFilter)
    return PrivateTree.fromName(mmpt, name, key)
  }

  static async fromName(mmpt: MMPT, name: PrivateName, key: string): Promise<PrivateTree> {
    const info = await protocol.priv.getByName(mmpt, name, key)
    if(!check.isPrivateTreeInfo(info)) {
      throw new Error(`Could not parse a valid private tree using the given key`)
    }
    return new PrivateTree({ mmpt, info, key })
  }

  static async fromInfo(mmpt: MMPT, key: string, info: PrivateTreeInfo): Promise<PrivateTree> {
    return new PrivateTree({ mmpt, key, info })
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<PrivateTree> {
    const key = await genKeyStr()
    const child = await PrivateTree.create(this.mmpt, key, this.info.bareNameFilter)
    await this.updateDirectChild(child, name, onUpdate)
    return child
  }

  async createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<PrivateFile>{
    const existing = await this.getDirectChild(name)
    let file: PrivateFile
    if (existing === null) {
      const key = await genKeyStr()
      file = await PrivateFile.create(this.mmpt, content, this.info.bareNameFilter, key)
    } else if (PrivateFile.instanceOf(existing)) {
      file = await existing.updateContent(content)
    } else {
      throw new Error(`There is already a directory with that name: ${name}`)
    }
    await this.updateDirectChild(file, name, onUpdate)
    return file
  }

  async putDetailed(): Promise<PrivateAddResult> {
    // copy the object, so we're putting the current version & don't include any revisions
    const nodeCopy = Object.assign({}, this.info)
    return protocol.priv.addNode(this.mmpt, nodeCopy, this.key)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    this.children[name] = child
    const details = await child.putDetailed()
    this.updateLink(name, details)
    onUpdate && await onUpdate()
    return this
  }

  removeDirectChild(name: string): this {
    this.info = {
      ...this.info,
      revision: this.info.revision + 1,
      links: removeKeyFromObj(this.info.links, name),
      skeleton: removeKeyFromObj(this.info.skeleton, name)
    }
    if(this.children[name]) {
      delete this.children[name]
    }
    return this
  }

  async getDirectChild(name: string): Promise<PrivateTree | PrivateFile | null>{
    if(this.children[name]) {
      return this.children[name]
    }

    const childInfo = this.info.links[name]
    if(childInfo === undefined) return null
    const child = childInfo.isFile
      ? await PrivateFile.fromName(this.mmpt, childInfo.pointer, childInfo.key)
      : await PrivateTree.fromName(this.mmpt, childInfo.pointer, childInfo.key)

    // check that the child wasn't added while retrieving the content from the network
    if(this.children[name]) {
      return this.children[name]
    }

    this.children[name] = child
    return child
  }

  async getName(): Promise<PrivateName> {
    const { bareNameFilter, revision } = this.info
    const revisionFilter = await namefilter.addRevision(bareNameFilter, this.key, revision)
    return namefilter.toPrivateName(revisionFilter)
  }

  async updateParentNameFilter(parentNameFilter: BareNameFilter): Promise<this> {
    this.info.bareNameFilter = await namefilter.addToBare(parentNameFilter, this.key)
    return this
  }

  async get(path: string): Promise<PrivateTree | PrivateFile | null> {
    const parts = pathUtil.splitParts(path)
    if(parts.length === 0) return this

    const [head, ...rest] = parts

    const next = this.info.skeleton[head]
    if(next === undefined) return null

    const node = await this.getRecurse(next, rest)
    if(node === null) return null
      
    return check.isPrivateFileInfo(node)
      ? PrivateFile.fromInfo(this.mmpt, next.key, node)
      : PrivateTree.fromInfo(this.mmpt, next.key, node)
  }

  async getRecurse(nodeInfo: PrivateSkeletonInfo, parts: string[]): Promise<Maybe<DecryptedNode>> {
    const [head, ...rest] = parts
    if(head === undefined) {
      return protocol.priv.getByCID(this.mmpt, nodeInfo.cid, nodeInfo.key)
    }
    const nextChild = nodeInfo.subSkeleton[head]
    if(nextChild !== undefined) {
      return this.getRecurse(nextChild, rest)
    }

    const reloadedNode = await protocol.priv.getByCID(this.mmpt, nodeInfo.cid, nodeInfo.key)
    if(!check.isPrivateTreeInfo(reloadedNode)){
      return null
    }
    const reloadedNext = reloadedNode.skeleton[head]
    return reloadedNext === undefined ? null : this.getRecurse(reloadedNext, rest)
  }

  getLinks(): BaseLinks {
    return mapObj(this.info.links, (link) => {
      const { key, ...rest } = link
      return { ...rest  }
    })
  }

  updateLink(name: string, result: PrivateAddResult): this {
    const { cid, size, key, isFile, skeleton } = result
    const pointer = result.name
    this.info.links[name] = { name, key, pointer, size, isFile: isFile, mtime: Date.now() }
    this.info.skeleton[name] = { cid, key, subSkeleton: skeleton }
    this.info.revision = this.info.revision + 1
    this.info.metadata.unixMeta.mtime = Date.now()
    return this
  }

}
