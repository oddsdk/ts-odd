import { FileContent, CID, AddResult } from '../ipfs'


// FILESYSTEM
// -----

export type FileSystemOptions = {
  version?: SemVer
  keyName?: string
  rootDid?: string
}

export enum Branch {
  Public = 'public',
  Pretty = 'pretty',
  Private = 'private'
}


// FILES
// -----

export interface File {
  content: FileContent
  put(): Promise<CID>
  putDetailed(): Promise<AddResult>
}

export interface HeaderFile extends File {
  metadata: Metadata
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
  isFile: boolean
  mtime: number
  ctime: number
  version: SemVer
}

export type ChildrenMetadata = { [name: string]: Metadata }

export type SkeletonInfo = {
  cid: CID
  userland: CID
  metadata: CID
  children: Skeleton
}

export type Skeleton = { [name: string]: SkeletonInfo }

export type TreeInfo = {
  metadata: Metadata
  skeleton: Skeleton
  children: ChildrenMetadata
  userland: CID
}

export type FileInfo = {
  metadata: Metadata
  userland: CID
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
export type SyncHook = (result: CID) => unknown
export type SyncHookDetailed = (result: AddResult) => unknown

export type SemVer = {
  major: number
  minor: number
  patch: number
}

// TREE
// ----

export interface UnixTree {
  ls(path: string): Promise<Links>
  mkdir(path: string): Promise<this>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<this>
  rm(path: string): Promise<this>
  exists(path: string): Promise<boolean>
}

export interface Tree {
  version: SemVer

  ls(path: string): Promise<Links>
  mkdir(path: string): Promise<this>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<this>
  rm(path: string): Promise<Tree>
  get(path: string): Promise<Tree | File | null>
  exists(path: string): Promise<boolean>
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
  skeleton: Skeleton
  metadata: Metadata

  putDetailed(): Promise<PutDetails>
}

