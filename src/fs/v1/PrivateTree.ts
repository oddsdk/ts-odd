import { AddResult, CID, FileContent } from '../../ipfs'
import MMPT from '../protocol/private/mmpt'
import { DecryptedNode, PrivateName, BareNameFilter, PrivateSkeletonInfo, PrivateDirectory, AESKey, PrivateChildren, Revision, PrivateFile, NamedAddResult } from '../protocol/private/types'
import * as keystore from '../../keystore'
import * as protocol from '../protocol'
import * as check from '../protocol/private/types/check'
import * as pathUtil from '../path'
import * as header from './header'
import * as namefilter from '../protocol/private/namefilter'
import { isObject, Maybe } from '../../common'
import { NonEmptyPath, SyncHookDetailed, UnixTree } from '../types'

type CreateChildFn = (parent: PrivateDirectory, name: string, key: string) => DecryptedNode | Promise<DecryptedNode>

export default class PrivateTree implements UnixTree {

  mmpt: MMPT
  baseName: PrivateName
  baseKey: AESKey
  onUpdate: Maybe<SyncHookDetailed> = null

  constructor(mmpt: MMPT, baseName: PrivateName, baseKey: AESKey) {
    this.mmpt = mmpt
    this.baseName = baseName
    this.baseKey = baseKey
  }

  static instanceOf(obj: any): obj is PrivateTree {
    return isObject(obj) 
      && obj.mmpt !== undefined 
      && obj.baseName !== undefined
      && obj.baseKey !== undefined
  }

  static async create(baseKey: string): Promise<PrivateTree> {
    const mmpt = await MMPT.create()
    const bareNameFilter = await namefilter.createBare(baseKey)
    const revisionFilter = await namefilter.addRevision(bareNameFilter, baseKey, 1)
    const baseName = await namefilter.toPrivateName(revisionFilter)
    const fs = new PrivateTree(mmpt, baseName, baseKey)
    await fs.addNode({
      metadata: {
        ...header.emptyMetadata(),
        name: 'private'
      },
      bareNameFilter,
      revision: 1,
      children: {},
      skeleton: {},
    }, baseKey)
    return fs
  }

  static async fromCID(cid: CID, baseKey: string, bareName?: BareNameFilter): Promise<PrivateTree> {
    const mmpt = await MMPT.fromCID(cid)
    bareName = bareName || await namefilter.createBare(baseKey)
    const result = await protocol.priv.findLatestRevision(mmpt, bareName, baseKey, 0)
    if(result === null){
      throw new Error("Could not find name")
    }
    const fs = new PrivateTree(mmpt, result.name, baseKey)
    return fs
  }

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async putDetailed(): Promise<AddResult> {
    const result = await this.mmpt.put()
    if(this.onUpdate !== null){
      this.onUpdate(result)
    }
    return result
  }

  async ls(path: string): Promise<PrivateChildren> {
    const dir = await this.get(path)
    if(dir === null){
      throw new Error("Path does not exist")
    } else if (!check.isPrivateDirectory(dir)) {
      throw new Error('Can not `ls` a file')
    }
    return dir.children
  }
  
  async mkdir(path: string): Promise<this> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null) {
      throw Error("No path entered")
    }
    const exists = await this.pathExists(path)
    if (exists) {
      throw new Error(`Path already exists: ${path}`)
    }
    return this.addWithFn(path, (parent, name, key) => 
      protocol.priv.createPrivateDir(parent.bareNameFilter, name, key))
  }

  async cat(path: string): Promise<FileContent> {
    const file = await this.get(path)
    if (file === null) {
      throw new Error("Path does not exist")
    } else if (!check.isPrivateFile(file)) {
      throw new Error('Can not `cat` a directory')
    }
    return protocol.getFile(file.content, file.key)
  }

  async exists(path: string): Promise<boolean> {
    const node = await this.get(path)
    return node !== null
  }

  async add(path: string, content: FileContent): Promise<this> {
    let file = await this.get(path)
    if(file !== null && !check.isPrivateFile(file)){
      throw new Error("Can not change a directory to a file")
    }
    const ownKey = file === null ? await keystore.genKeyStr() : file.key
    const { cid } = await protocol.putFile(content, ownKey)
    return this.addWithFn(path, async (parent, name, key) => {
      if(file !== null) {
        return protocol.priv.updateFile(file as PrivateFile, cid)
      }else{
        return protocol.priv.createPrivateFile(parent.bareNameFilter, name, key, ownKey, cid)
      }
    })
  }

  async addNode(node: DecryptedNode, key: string): Promise<NamedAddResult> {
    const { cid, size } = await protocol.putFile(node, key)
    const filter = await namefilter.addRevision(node.bareNameFilter, key, node.revision)
    const name = await namefilter.toPrivateName(filter)
    await this.mmpt.add(name, cid)
    return { cid, name, size }
  }

  async addWithFn(relPath: string, createChild: CreateChildFn): Promise<this> {
    const parent = await this.getByName(this.baseName, this.baseKey)
    const parts = pathUtil.splitNonEmpty(relPath)
    if(!check.isPrivateDirectory(parent)){
      throw new Error("Can not add a child to file")
    }
    if(parts === null){
      throw new Error("Must provide a nonempty path")
    }
    const baseNode = await this.addRecurse(parent, parts, createChild)
    const { name } = await this.addNode(baseNode, this.baseKey)
    this.baseName = name
    await this.put()
    return this
  }

  async addRecurse(parent: PrivateDirectory, parts: NonEmptyPath, createChild: CreateChildFn): Promise<DecryptedNode> {
    const nextPath = pathUtil.nextNonEmpty(parts)
    const head = parts[0]
    const key = parent.children[head]?.key || await keystore.genKeyStr()
    let toAdd: DecryptedNode
    if(nextPath === null) {
      toAdd = await createChild(parent, head, key)
    }else {
      const childInfo = parent.skeleton[head] || null
      const childNode = childInfo === null
        ? await protocol.priv.createPrivateDir(parent.bareNameFilter, head, key)
        : await this.getByCID(childInfo.cid, childInfo.key)
      if(!check.isPrivateDirectory(childNode)) {
        throw new Error("Can not add a child to file")
      }
      toAdd = await this.addRecurse(childNode, nextPath, createChild)
    }

    const { cid, size } = await this.addNode(toAdd, key)
    parent.children[head] = {
      name: head,
      key,
      cid,
      size,
      isFile: check.isPrivateFile(toAdd)
    }
    parent.skeleton[head] = {
      cid,
      key,
      children: check.isPrivateDirectory(toAdd) ? toAdd.skeleton : {}
    }
    parent.revision = parent.revision + 1
    return parent
  }

  async rm(path: string): Promise<this> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null){
      throw new Error("Path does not exist")
    }
    const filename = parts[parts.length - 1]
    const parentPath = pathUtil.join(parts.slice(0, parts.length - 1))
    const node = await this.get(parentPath)

    if (node === null || check.isPrivateFile(node)) {
      throw new Error("Path does not exist")
    }

    const updated = protocol.priv.removeChildFromDir(node, filename)
    if(parentPath.length === 0){
      const { name } = await this.addNode(updated, this.baseKey)
      this.baseName = name
    }else {
      await this.addWithFn(parentPath, () => updated)
    }
    await this.put()
    return this
  }

  async pathExists(relPath: string): Promise<boolean> {
    const node = await this.get(relPath)
    return node != null
  }

  async get(relPath: string): Promise<Maybe<DecryptedNode>> {
    const root = await this.getByName(this.baseName, this.baseKey)
    const parts = pathUtil.splitParts(relPath)
    if(parts.length === 0 || root === null){
      return root
    }
    if(!check.isPrivateDirectory(root)){
      return null
    }
    const [head, ...rest] = parts
    return root.skeleton[head] === undefined
      ? null
      : this.getRecurse(root.skeleton[head], rest)
  }

  async getRecurse(nodeInfo: PrivateSkeletonInfo, parts: string[]): Promise<Maybe<DecryptedNode>> {
    const [head, ...rest] = parts
    if(head === undefined) {
      return this.getByCID(nodeInfo.cid, nodeInfo.key)
    }
    const nextChild = nodeInfo.children[head]
    if(nextChild !== undefined) {
      return this.getRecurse(nextChild, rest)
    }

    const reloadedNode = await this.getByCID(nodeInfo.cid, nodeInfo.key)
    if(!check.isPrivateDirectory(reloadedNode)){
      return null
    }
    const reloadedNext = reloadedNode.skeleton[head]
    return reloadedNext === undefined ? null : this.getRecurse(reloadedNext, rest)
  }

  async getByName(name: PrivateName, key: string): Promise<Maybe<DecryptedNode>> {
    const cid = await this.mmpt.get(name)
    if(cid === null) return null
    return this.getByCID(cid, key)
  }

  async getByCID(cid: CID, key: string): Promise<DecryptedNode> {
    const node = await protocol.priv.readNode(cid, key)
    const latest = await protocol.priv.findLatestRevision(this.mmpt, node.bareNameFilter, key, node.revision)
    return protocol.priv.readNode(latest?.cid || cid, key)
  }
}
