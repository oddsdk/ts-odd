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

export interface SimpleFile {
  content: FileContent
  put(): Promise<CID>
}

export interface File extends SimpleFile {
  getHeader(): Header
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

// TREE
// ----

export interface SimpleTree {
  version: SemVer

  ls(path: string): Promise<Links>
  mkdir(path: string): Promise<this>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<this>
  rm(path: string): Promise<SimpleTree>
  get(path: string): Promise<SimpleTree | SimpleFile | null>
  pathExists(path: string): Promise<boolean>
  addChild(path: string, toAdd: SimpleTree | SimpleFile): Promise<this>
  addRecurse (path: NonEmptyPath, child: SimpleTree | FileContent): Promise<this>

  put(): Promise<CID>
  updateDirectChild (child: SimpleTree | SimpleFile, name: string): Promise<this>
  removeDirectChild(name: string): Promise<this>
  getDirectChild(name: string): Promise<SimpleTree | SimpleFile | null>
  getOrCreateDirectChild(name: string): Promise<SimpleTree | SimpleFile>

  createEmptyTree(): Promise<SimpleTree>
  createTreeFromCID(cid: CID): Promise<SimpleTree>
  createFile(content: FileContent): SimpleFile
  createFileFromCID(cid: CID): Promise<SimpleFile>

  getLinks(): Links
}

export interface Tree extends SimpleTree {
  getHeader(): Header
  updateHeader(name: string, childInfo: Maybe<NodeInfo>): Promise<Tree>

  createEmptyTree(): Promise<SimpleTree>
  createTreeFromCID(cid: CID): Promise<SimpleTree>
}

