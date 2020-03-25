import pathUtil from '../path'
import { addChildRecurse, getRecurse } from '../helpers'
import privNode, { PrivateNode } from './node'
import { Tree, Link } from '../types'
import { CID, FileContent } from '../../ipfs'
import { genKeyStr } from './helpers'

export class PrivateTree implements Tree {

  root: PrivateNode
  key: string

  constructor(root: PrivateNode, key: string) {
    this.root = root
    this.key = key
  }

  async put(): Promise<CID> {
    return this.root.put(this.key)
  }

  async cid(): Promise<CID> {
    return this.put()
  }

  async listDir(path: string): Promise<Link[] | null> {
    const node = await this.get(path)
    return node?.links || []
  }

  async makeDir(path: string): Promise<PrivateTree> {
    const toAdd = await privNode.empty()
    return this.addChild(path, toAdd, false)
  }

  async addFile(path: string, content: FileContent): Promise<PrivateTree> {
    const toAdd = await privNode.fromContent(content)
    return this.addChild(path, toAdd, true)
  }

  async getFile(path: string): Promise<FileContent | null> {
    const node = await this.get(path)
    if(node === null) {
      return null
    }
    return node.resolveContent()
  }

  async get(path: string): Promise<PrivateNode | null> {
    const node = await getRecurse(this.root, pathUtil.split(path)) 
    if(node === null) {
      return null
    }
    return node as PrivateNode
  }

  async addChild(path: string, toAdd: PrivateNode, shouldOverwrite: boolean = true): Promise<PrivateTree> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null) {
      return this
    }
    this.root = (await addChildRecurse(this.root, parts, toAdd, shouldOverwrite)) as PrivateNode
    return this
  }
}

export async function empty() {
  const root = await privNode.empty()
  const key = await genKeyStr()
  return new PrivateTree(root, key)
}

export async function resolve(cid: CID, keyStr: string) {
  const root = await privNode.resolve(cid, keyStr)
  return new PrivateTree(root, keyStr)
}

export default {
  PrivateTree,
  empty,
  resolve
}
