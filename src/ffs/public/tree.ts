import pathUtil from '../path'
import publicNode, { PublicNode } from "./node"
import { Tree, Link } from "../types"
import { CID, FileContent } from '../../ipfs'
import { getRecurse, addChildRecurse } from "../helpers"

class PublicTree implements Tree {

  root: PublicNode

  constructor(root: PublicNode) {
    this.root = root
  }

  async put(): Promise<CID> {
    return this.root.put()
  }

  async cid(): Promise<CID> {
    return this.put()
  }

  async listDir(path: string): Promise<Link[] | null> {
    const node = await this.get(path)
    return node?.links() || []
  }

  async makeDir(path: string): Promise<PublicTree> {
    const toAdd = await publicNode.empty()
    return this.addChild(path, toAdd, false)
  }

  async addFile(path: string, content: FileContent): Promise<PublicTree> {
    const toAdd = await publicNode.fromContent(content)
    return this.addChild(path, toAdd, true)
  }

  async get(path: string): Promise<PublicNode | null> {
    const node = await getRecurse(this.root, pathUtil.split(path))
    if(node === null) {
      return null
    }
    return node as PublicNode
  }

  async addChild(path: string, toAdd: PublicNode, shouldOverwrite: boolean = true): Promise<PublicTree> {
    const parts = pathUtil.splitNonEmpty(path)
    if(parts === null) {
      return this
    }
    this.root = (await addChildRecurse(this.root, parts, toAdd, shouldOverwrite)) as PublicNode
    return this
  }
}

export async function empty() {
  const root = await publicNode.empty()
  return new PublicTree(root)
}

export async function resolve(cid: CID) {
  const root = await publicNode.resolve(cid)
  return new PublicTree(root)
}

export default {
  PublicTree,
  empty,
  resolve
}
