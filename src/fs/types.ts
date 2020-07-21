import { FileContent, CID, AddResult } from '../ipfs'
import { Maybe } from '../common/types'


// FILESYSTEM
// -----

export type FileSystemOptions = {
  version?: SemVer
  keyName?: string
  rootDid?: string
}


// FILES
// -----

export interface File {
  content: FileContent
  put(): Promise<CID>
  putDetailed(): Promise<AddResult>
}

export interface HeaderFile extends File {
  parentKey: Maybe<string>
  getHeader(): HeaderV1
  putDetailed(): Promise<PutDetails>
}

// LINKS
// -----

export type AddLinkOpts = {
  shouldOverwrite?: boolean
}

export type Link = {
  name: string
  cid: CID
  size: number
  mtime?: number
  isFile: boolean
}

export type Links = { [name: string]: Link }


// HEADER
// -----

export type Metadata = {
  name: string
  isFile: boolean
  mtime: number
  ctime: number
  version: SemVer
}

export type Children = { [name: string]: Metadata }

export type HeaderV1 = {
  name: string
  isFile: boolean
  mtime: number
  ctime: number
  version: SemVer
  size: number
  key: Maybe<string>
  skeleton: Skeleton
  children: Children
}

export type SkeletonInfo = {
  cid: CID
  userland: CID
  metadata: CID
  children: Skeleton
  key: Maybe<string>
}

export type Skeleton = { [name: string]: SkeletonInfo }

export type IpfsSerialized = {
  metadata: Metadata
  skeleton: Skeleton
  children: Children
  userland: CID
  key: Maybe<string>
}

// MISC
// ----

export type PutDetails = {
  cid: CID
  userland: CID
  metadata: CID
  size: number
}

export type NonEmptyPath = [string, ...string[]]
export type SyncHook = (cid: CID) => unknown

export type SemVer = {
  major: number
  minor: number
  patch: number
}

// STATIC METHODS
// ----

export interface TreeStatic {
  empty (parentKey: Maybe<string>): Promise<HeaderTree>
  fromCID (cid: CID, parentKey: Maybe<string>): Promise<HeaderTree>
  fromHeaderAndUserland(header: HeaderV1, userland: CID, parentKey: Maybe<string>): Promise<HeaderTree>
}

export interface FileStatic {
  create(content: FileContent, parentKey: Maybe<string>): Promise<HeaderFile>
  fromCID(cid: CID, parentKey: Maybe<string>): Promise<HeaderFile>
  fromHeaderAndUserland(header: HeaderV1, userland: CID, parentKey: Maybe<string>): Promise<HeaderFile>
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
  putDetailed(): Promise<AddResult>
  updateDirectChild (child: Tree | File, name: string): Promise<this>
  removeDirectChild(name: string): Promise<this>
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string): Promise<Tree | File>

  emptyChildTree(): Promise<Tree>
  createChildFile(content: FileContent): Promise<File>

  getLinks(): Links
}

export interface HeaderTree extends Tree {
  parentKey: Maybe<string>
  getHeader(): HeaderV1
  putDetailed(): Promise<PutDetails>
}

