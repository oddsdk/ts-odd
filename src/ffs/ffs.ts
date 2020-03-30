import pubTree, { PublicTree } from './pub/tree'
import privTree, { PrivateTree } from './priv/tree'
import pubNode, { PublicNode } from './pub/node'
import { Tree, Node, Link } from './types'
import { CID, FileContent } from '../ipfs'
import pathUtil from './path'

export class FFS {

  root: PublicNode
  pubTree: PublicTree
  privTree: PrivateTree

  constructor(root: PublicNode, pubTree: PublicTree, privTree: PrivateTree) {
    this.root = root
    this.pubTree = pubTree
    this.privTree = privTree
  }

  static async empty(rootKeyName: string = 'filesystem-root'): Promise<FFS> {
    const root = await pubNode.empty()
    const pubTreeInstance = await pubTree.empty()
    const privTreeInstance = await privTree.empty(rootKeyName)
    return new FFS(root, pubTreeInstance, privTreeInstance)
  }

  // upgrade public IPFS folder to FileSystem
  static async upgradePublicCID(cid: CID, rootKeyName: string = 'filesystem-root'): Promise<FFS> {
    const root = await pubNode.empty()
    const pubTreeInstance = await pubTree.resolve(cid)
    const privTreeInstance = await privTree.empty(rootKeyName)
    return new FFS(root, pubTreeInstance, privTreeInstance)
  }

  static async fromCID(cid: CID, rootKeyName: string = 'filesystem-root'): Promise<FFS | null> {
    const root = await pubNode.resolve(cid)
    const pubLink = root.findLink('public')
    const privLink = root.findLink('private')
    if(pubLink === null || privLink === null) {
      return null
    }
    const pubTreeInstance = await pubTree.resolve(pubLink.cid)
    const privTreeInstance = await privTree.resolve(privLink.cid, rootKeyName)
    return new FFS(root, pubTreeInstance, privTreeInstance)
  }

  async put(): Promise<CID> {
    await this.updateRoot()
    return this.root.put()
  }

  async cid(): Promise<CID> {
    return this.put()
  }

  async listDir(path: string): Promise<Link[] | null> {
    const { tree, tail } = this.parsePath(path)
    return tree.listDir(tail)
  }

  async makeDir(path: string): Promise<FFS> {
    const { tree, tail } = this.parsePath(path)
    await tree.makeDir(tail)
    return this.updateRoot()
  }

  async addFile(path: string, content: FileContent): Promise<FFS> {
    const { tree, tail } = this.parsePath(path)
    await tree.addFile(tail, content)
    return this.updateRoot()
  }

  async getFile(path: string): Promise<FileContent | null> {
    const { tree, tail } = this.parsePath(path)
    return tree.getFile(tail)
  }

  async getNode(path: string): Promise<Node | null> {
    const { tree, tail } = this.parsePath(path)
    return tree.getNode(tail)
  }

  async updateRoot(): Promise<FFS> {
    const pubCID = await this.pubTree.put()
    const privCID = await this.privTree.put()
    const pubLink = { name: 'public', cid: pubCID }
    const privLink = { name: 'private', cid: privCID }
    this.root.replaceLink(pubLink)
    this.root.replaceLink(privLink)
    return this
  }

  parsePath(path: string): { tree: Tree, tail: string } {
    const parts = pathUtil.split(path)
    const head = parts[0]
    const tail = pathUtil.join(parts.slice(1))
    let tree: Tree
    if(head === 'public') {
      tree = this.pubTree
    }else if(head === 'private') {
      tree = this.privTree
    }else {
      throw new Error("Not a valid FFS path")
    }
    return { tree, tail }
  }
}

export default FFS
