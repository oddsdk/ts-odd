import { FileContent } from '../../ipfs'
import MMPT from '../protocol/private/mmpt'
import PrivateFile from './PrivateFile'
import { DecryptedNode, PrivateSkeletonInfo, PrivateTreeInfo, PrivateAddResult, PrivateLinks } from '../protocol/private/types'
import * as protocol from '../protocol'
import * as check from '../protocol/private/types/check'
import * as pathUtil from '../path'
import * as metadata from '../metadata'
import * as semver from '../semver'
import * as namefilter from '../protocol/private/namefilter'
import { PrivateName, BareNameFilter } from '../protocol/private/namefilter'
import { isObject, mapObj, mapObjAsync, Maybe, removeKeyFromObj } from '../../common'
import { BaseLinks, Links, SyncHookDetailed } from '../types'
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

  onUpdate: Maybe<SyncHookDetailed> = null

  constructor({ mmpt, key, info}: ConstructorParams) {
    super(semver.v1)
    this.mmpt = mmpt
    this.key = key
    this.info = info
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

  async emptyChildTree(): Promise<PrivateTree> {
    const key = await genKeyStr()
    return PrivateTree.create(this.mmpt, key, this.info.bareNameFilter)
  }

  async createChildFile(content: FileContent): Promise<PrivateFile>{
    const key = await genKeyStr()
    return PrivateFile.create(this.mmpt, content, this.info.bareNameFilter, key)
  }

  async putDetailed(): Promise<PrivateAddResult> {
    const result = await protocol.priv.addNode(this.mmpt, {
      ...this.info, 
      metadata: metadata.updateMtime(this.info.metadata)
    }, this.key)
    if(this.onUpdate !== null){
      const syncResult = await this.mmpt.put()
      this.onUpdate(syncResult)
    }
    return result
  }

  async updateDirectChild (child: PrivateTree | PrivateFile, name: string): Promise<this> {
    await child.updateParentNameFilter(this.info.bareNameFilter)
    const { cid, size, key } = await child.putDetailed()
    const pointer = await child.getName()
    this.info.links[name] = { name, key, pointer, size, isFile: PrivateFile.instanceOf(child), mtime: Date.now() }
    this.info.skeleton[name] = { cid, key, subSkeleton: PrivateTree.instanceOf(child) ? child.info.skeleton : {} }
    this.info.revision = this.info.revision + 1
    return this
  }

  removeDirectChild(name: string): this {
    this.info = {
      ...this.info,
      revision: this.info.revision + 1,
      links: removeKeyFromObj(this.info.links, name),
      skeleton: removeKeyFromObj(this.info.skeleton, name)
    }
    return this
  }

  async getDirectChild(name: string): Promise<PrivateTree | PrivateFile | null>{
    const child = this.info.links[name]
    if(child === undefined) return null
    return child.isFile
      ? PrivateFile.fromName(this.mmpt, child.pointer, child.key)
      : PrivateTree.fromName(this.mmpt, child.pointer, child.key)
  }

  async getOrCreateDirectChild(name: string): Promise<PrivateTree | PrivateFile> {
    const child = await this.getDirectChild(name)
    return child ? child : this.emptyChildTree()
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

  getLinks(): BaseLinks {
    return mapObj(this.info.links, (link) => {
      const { key, ...rest } = link
      return { ...rest  }
    })
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
      ? PrivateFile.fromInfo(this.mmpt, node)
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
}
