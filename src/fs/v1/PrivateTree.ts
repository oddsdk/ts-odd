import BaseTree from '../base/tree'
import MMPT from '../protocol/private/mmpt'
import PrivateFile from './PrivateFile'
import PrivateHistory from './PrivateHistory'
import { BaseLinks, UpdateCallback } from '../types'
import { DecryptedNode, PrivateSkeletonInfo, PrivateTreeInfo, PrivateAddResult, Revision } from '../protocol/private/types'
import { FileContent } from '../../ipfs'
import { PrivateName, BareNameFilter } from '../protocol/private/namefilter'
import { genKeyStr } from '../../keystore'
import { isObject, mapObj, Maybe, removeKeyFromObj } from '../../common'
import * as check from '../protocol/private/types/check'
import * as history from './PrivateHistory'
import * as metadata from '../metadata'
import * as namefilter from '../protocol/private/namefilter'
import * as pathUtil from '../path'
import * as protocol from '../protocol'
import * as semver from '../semver'


type ConstructorParams = {
  header: PrivateTreeInfo
  key: string
  mmpt: MMPT
}


export default class PrivateTree extends BaseTree {

  children: { [name: string]: PrivateTree | PrivateFile }
  header: PrivateTreeInfo
  history: PrivateHistory
  key: string
  mmpt: MMPT

  constructor({ mmpt, key, header}: ConstructorParams) {
    super(semver.v1)

    this.children = {}
    this.header = header
    this.history = new PrivateHistory(this as unknown as history.Node)
    this.key = key
    this.mmpt = mmpt
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return isObject(obj)
      && obj.mmpt !== undefined
      && check.isPrivateTreeInfo(obj.header)
  }

  static async create(mmpt: MMPT, key: string, parentNameFilter: Maybe<BareNameFilter>): Promise<PrivateTree> {
    const bareNameFilter = parentNameFilter
      ? await namefilter.addToBare(parentNameFilter, key)
      : await namefilter.createBare(key)
    return new PrivateTree({
      mmpt,
      key,
      header: {
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
    const info = await protocol.priv.getByLatestName(mmpt, name, key)

    if (!check.isPrivateTreeInfo(info)) {
      throw new Error(`Could not parse a valid private tree using the given key`)
    }

    return new PrivateTree({ mmpt, key, header: info })
  }

  static async fromName(mmpt: MMPT, name: PrivateName, key: string): Promise<PrivateTree> {
    const info = await protocol.priv.getByName(mmpt, name, key)

    if (!check.isPrivateTreeInfo(info)) {
      throw new Error(`Could not parse a valid private tree using the given key`)
    }

    return new PrivateTree({ mmpt, key, header: info })
  }

  static async fromInfo(mmpt: MMPT, key: string, info: PrivateTreeInfo): Promise<PrivateTree> {
    return new PrivateTree({ mmpt, key, header: info })
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<PrivateTree> {
    const key = await genKeyStr()
    const child = await PrivateTree.create(this.mmpt, key, this.header.bareNameFilter)

    const existing = this.children[name]
    if (existing) {
      if (PrivateFile.instanceOf(existing)) {
        throw new Error(`There is a file at the given path: ${name}`)
      }
      return existing
    }

    await this.updateDirectChild(child, name, onUpdate)
    return child
  }

  async createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<PrivateFile>{
    const existing = await this.getDirectChild(name)

    let file: PrivateFile
    if (existing === null) {
      const key = await genKeyStr()
      file = await PrivateFile.create(this.mmpt, content, this.header.bareNameFilter, key)
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
    const nodeCopy = Object.assign({}, this.header)
    return protocol.priv.addNode(this.mmpt, nodeCopy, this.key)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    await child.updateParentNameFilter(this.header.bareNameFilter)
    this.children[name] = child
    const details = await child.putDetailed()
    this.updateLink(name, details)
    onUpdate && await onUpdate()
    return this
  }

  removeDirectChild(name: string): this {
    this.header = {
      ...this.header,
      revision: this.header.revision + 1,
      links: removeKeyFromObj(this.header.links, name),
      skeleton: removeKeyFromObj(this.header.skeleton, name)
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

    const childInfo = this.header.links[name]
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
    const { bareNameFilter, revision } = this.header
    const revisionFilter = await namefilter.addRevision(bareNameFilter, this.key, revision)
    return namefilter.toPrivateName(revisionFilter)
  }

  async updateParentNameFilter(parentNameFilter: BareNameFilter): Promise<this> {
    this.header.bareNameFilter = await namefilter.addToBare(parentNameFilter, this.key)
    return this
  }

  async get(path: string): Promise<PrivateTree | PrivateFile | null> {
    const parts = pathUtil.splitParts(path)
    if(parts.length === 0) return this

    const [head, ...rest] = parts

    const next = this.header.skeleton[head]
    if(next === undefined) return null

    const result = await this.getRecurse(next, rest)
    if (result === null) return null

    return check.isPrivateFileInfo(result.node)
      ? PrivateFile.fromInfo(this.mmpt, result.key, result.node)
      : PrivateTree.fromInfo(this.mmpt, result.key, result.node)
  }

  async getRecurse(nodeInfo: PrivateSkeletonInfo, parts: string[]): Promise<Maybe<{ key: string, node: DecryptedNode }>> {
    const [head, ...rest] = parts
    if (head === undefined) return {
      key: nodeInfo.key,
      node: await protocol.priv.getByCID(nodeInfo.cid, nodeInfo.key)
    }

    const nextChild = nodeInfo.subSkeleton[head]
    if (nextChild !== undefined) {
      return this.getRecurse(nextChild, rest)
    }

    const reloadedNode = await protocol.priv.getByCID(nodeInfo.cid, nodeInfo.key)
    if (!check.isPrivateTreeInfo(reloadedNode)) {
      return null
    }

    const reloadedNext = reloadedNode.skeleton[head]
    return reloadedNext === undefined ? null : this.getRecurse(reloadedNext, rest)
  }

  getLinks(): BaseLinks {
    return mapObj(this.header.links, (link) => {
      const { key, ...rest } = link
      return { ...rest  }
    })
  }

  updateLink(name: string, result: PrivateAddResult): this {
    const { cid, size, key, isFile, skeleton } = result
    const pointer = result.name
    this.header.links[name] = { name, key, pointer, size, isFile: isFile, mtime: Date.now() }
    this.header.skeleton[name] = { cid, key, subSkeleton: skeleton }
    this.header.revision = this.header.revision + 1
    this.header.metadata.unixMeta.mtime = Date.now()
    return this
  }

}
