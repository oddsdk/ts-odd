import pubTree, { PublicTree } from './public/tree'
import privTree, { PrivateTree } from './priv/tree'
import pubNode, { PublicNode } from './public/node'
import { Tree, Node, Link } from './types'
import { CID, FileContent } from '../ipfs'

class FFS {

  root: PublicNode
  pubTree: PublicTree
  privTree: PrivateTree

  constructor(root: PublicNode, pubTree: PublicTree, privTree: PrivateTree) {
    this.root = root
    this.pubTree = pubTree
    this.privTree = privTree
  }

  async put(): Promise<CID> {
    return this.root.put()
  }

  async cid(): Promise<CID> {
    return this.put()
  }

  async listDir(path: string, isPublic: boolean = false): Promise<Link[] | null> {
    if(isPublic) {
      return this.pubTree.listDir(path)
    } else {
      return this.privTree.listDir(path)
    }
  }

  async makeDir(path: string, isPublic: boolean = false): Promise<FFS> {
    if(isPublic) {
      this.pubTree = await this.pubTree.makeDir(path)
    } else {
      this.privTree = await this.privTree.makeDir(path)
    }
    return this.updateRoot()
  }

  async addFile(path: string, content: FileContent, isPublic: boolean = false): Promise<FFS> {
    if(isPublic) {
      this.pubTree = await this.pubTree.addFile(path, content)
    } else {
      this.privTree = await this.privTree.addFile(path, content)
    }
    return this.updateRoot()
  }

  async getFile(path: string, fromPublic: boolean = false): Promise<FileContent | null> {
    if(fromPublic) {
      return this.pubTree.get(path)
    } else {
      return this.privTree.get(path)
    }
  }

  async get(path: string, fromPublic: boolean = false): Promise<Node | null> {
    if(fromPublic) {
      return this.pubTree.get(path)
    } else {
      return this.privTree.get(path)
    }
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
}

export async function empty(): Promise<FFS> {
  const root = await pubNode.empty()
  const pubTreeInstance = await pubTree.empty()
  const privTreeInstance = await privTree.empty()
  return new FFS(root, pubTreeInstance, privTreeInstance)
}

export async function resolve(cid: CID, keyStr: string): Promise<FFS | null> {
  const root = await pubNode.resolve(cid)
  const pubLink = root.findLink('public')
  const privLink = root.findLink('private')
  if(pubLink === null || privLink === null) {
    return null
  }
  const pubTreeInstance = await pubTree.resolve(pubLink.cid)
  const privTreeInstance = await privTree.resolve(privLink.cid, keyStr)
  return new FFS(root, pubTreeInstance, privTreeInstance)
}

export default {
  FFS
}
