import { FileContent, CID } from '../ipfs'
import { Maybe } from '../common/types'


// FILESYSTEM
// -----

export type FileSystemOptions = {
  version?: SemVer
  keyName?: string
}


// FILES
// -----

export interface File {
  content: FileContent
  put(): Promise<CID>
  getHeader(): Header
}

export interface FileStatic {
  create: (content: FileContent, version: SemVer) => File
  fromCID: (cid: CID, key?: string) => Promise<File>
}

// LINKS
// -----

export type AddLinkOpts = {
  shouldOverwrite?: boolean
}

export type BasicLink = {
  name: string
  cid: CID
  size?: number
}

export type Link = BasicLink & {
  mtime?: number
  isFile: boolean
}

export type Links = { [name: string]: Link }
export type BasicLinks = { [name: string]: BasicLink }


// HEADER
// -----

export type Metadata = {
  name?: string
  isFile: boolean
  mtime?: number
  size: number
}

export type Header = Metadata & {
  version: SemVer
  key: Maybe<string>
  cache: NodeMap
}

export type NodeInfo = Header & {
  cid: CID
}

export type NodeMap = { [name: string]: NodeInfo }


// MISC
// ----

export type NonEmptyPath = [string, ...string[]]
export type SyncHook = (cid: CID) => unknown

export type SemVer = {
  major: number
  minor: number
  patch: number
}


// TREE
// ----

export type TreeData = {
  links: Links
}

export type PrivateTreeData = TreeData & {
  key: string
}

export interface TreeStatic {
  empty: (version: SemVer, key?: string) => Promise<Tree>
  fromCID: (cid: CID, key?: string) => Promise<Tree>
  fromHeader: (header: Header) => Promise<Tree>
}

export interface Tree extends SimpleTree {
  static: {
    tree: TreeStatic
    file: FileStatic
  }

  ls(path: string): Promise<Links>
  mkdir(path: string): Promise<Tree>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<Tree>
  rm(path: string): Promise<Tree>
  get(path: string): Promise<Tree | File | null>
  pathExists(path: string): Promise<boolean>
  addChild(path: string, toAdd: Tree | File): Promise<Tree>

  put(): Promise<CID>
  updateDirectChild(child: Tree | File, name: string): Promise<Tree>
  removeDirectChild(name: string): Promise<Tree>
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string): Promise<Tree | File>

  // data(): TreeData
  getHeader(): Header

  updateHeader(name: string, childInfo: Maybe<NodeInfo>): Promise<Tree>

  updateLink(link: NodeInfo): Tree
  findLink(name: string): NodeInfo | null
  findLinkCID(name: string): CID | null
  rmLink(name: string): Tree
  // copyWithLinks(links: Links): Tree
}

export interface SimpleTree {
  static: {
    tree: TreeStatic
    file: FileStatic
  }
  version: SemVer
  links: Links

  ls(path: string): Promise<Links>
  mkdir(path: string): Promise<Tree>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<Tree>
  rm(path: string): Promise<SimpleTree>
  get(path: string): Promise<SimpleTree | File | null>
  pathExists(path: string): Promise<boolean>
  addChild(path: string, toAdd: Tree | File): Promise<Tree>

  put(): Promise<CID>
  updateDirectChild(child: Tree | File, name: string): Promise<Tree>
  removeDirectChild(name: string): Promise<Tree>
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string): Promise<Tree | File>

  // data(): TreeData

  updateHeader(name: string, childInfo: Maybe<NodeInfo>): Promise<Tree>

  updateLink(link: NodeInfo): Tree
  findLink(name: string): NodeInfo | null
  findLinkCID(name: string): CID | null
  rmLink(name: string): Tree
  copyWithLinks(links: Links): Tree
}
