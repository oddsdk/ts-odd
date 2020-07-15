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
}

export interface HeaderFile extends File {
  getHeader(): HeaderV1
  putWithPins(): Promise<PutResult>
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

export type HeaderV1 = {
  name: string
  isFile: boolean
  mtime: number
  size: number
  version: SemVer
  key: Maybe<string>
  fileIndex: NodeMap
  pins: PinMap
}

export type PinMap = { [cid: string]: CID[] }

export type NodeInfo = HeaderV1 & {
  cid: CID
}

export type NodeMap = { [name: string]: NodeInfo }

export type UnstructuredHeader = { [name: string]: unknown }

// MISC
// ----

export type NonEmptyPath = [string, ...string[]]
export type SyncHook = (cid: CID) => unknown

export type SemVer = {
  major: number
  minor: number
  patch: number
}

export type PutResult = {
  cid: CID
  pins: CID[]
}

// STATIC METHODS
// ----

export interface TreeStatic {
  empty (parentKey: Maybe<string>): Promise<HeaderTree>
  fromCID (cid: CID, parentKey: Maybe<string>): Promise<HeaderTree>
  fromHeader (header: HeaderV1, parentKey: Maybe<string>): HeaderTree
}

export interface FileStatic {
  create(content: FileContent, parentKey: Maybe<string>): Promise<HeaderFile>
  fromCID(cid: CID, parentKey: Maybe<string>): Promise<HeaderFile>
}

export interface StaticMethods {
  tree: TreeStatic
  file: FileStatic
}

// TREE
// ----

export interface Tree {
  version: SemVer

  ls(path: string): Promise<Links>
  mkdir(path: string): Promise<this>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<this>
  rm(path: string): Promise<Tree>
  get(path: string): Promise<Tree | File | null>
  pathExists(path: string): Promise<boolean>
  addChild(path: string, toAdd: Tree | FileContent): Promise<this>
  addRecurse (path: NonEmptyPath, child: Tree | FileContent): Promise<this>

  put(): Promise<CID>
  updateDirectChild (child: Tree | File, name: string): Promise<this>
  removeDirectChild(name: string): Promise<this>
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string): Promise<Tree | File>

  emptyChildTree(): Promise<Tree>
  childTreeFromCID(cid: CID): Promise<Tree>
  createChildFile(content: FileContent): Promise<File>
  childFileFromCID(cid: CID): Promise<File>

  getLinks(): Links
}

export interface HeaderTree extends Tree {
  getHeader(): HeaderV1
  updateHeader(name: string, childInfo: Maybe<NodeInfo>): Promise<HeaderTree>

  childTreeFromHeader(heaer: HeaderV1): HeaderTree

  putWithPins(): Promise<PutResult>
}

