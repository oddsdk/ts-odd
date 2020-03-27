import { FileContent, CID } from '../ipfs'

export type AddLinkOpts = {
  shouldOverwrite?: boolean
}

export type NonEmptyPath = [string, ...string[]]

export type PrivateTreeData = {
  key: string
  links: Link[]
}

export type Link = {
  name: string
  cid: CID
  size?: number 
}

export interface PrivateTreeStatic extends TreeStatic {
  fromCIDWithKey: (cid: CID, keyStr: string) => Promise<Tree>
}

export interface TreeStatic {
  empty: () => Promise<Tree>
  fromCID: (cid: CID) => Promise<Tree>
  fromContent: (content: FileContent) => Promise<Tree>
}

export interface Tree {
  static: TreeStatic
  links: Link[]

  ls(path: string): Promise<Link[]>
  mkdir(path: string): Promise<Tree>
  cat(path: string): Promise<FileContent | null>
  add(path: string, content: FileContent): Promise<Tree>
  getTree(path: string): Promise<Tree | null>
  pathExists(path: string): Promise<boolean> 
  addChild(path: string, toAdd: Tree): Promise<Tree>

  put(): Promise<CID>
  updateDirectChild(child: Tree, name: string): Promise<Tree>
  getDirectChild(name: string): Promise<Tree | null>
  getOrCreateDirectChild(name: string): Promise<Tree>
  getOwnContent(): Promise<FileContent | null>

  isFile(): boolean
  copyWithLinks(links: Link[]): Tree
  findLink(name: string): Link | null
  addLink(link: Link): Tree
  rmLink(name: string): Tree
  replaceLink(link: Link): Tree
}
