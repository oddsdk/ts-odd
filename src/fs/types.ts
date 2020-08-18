import { FileContent, CID, AddResult } from '../ipfs'
import { SemVer } from './semver'


// FILES
// -----

export interface File {
  content: FileContent
  put(): Promise<CID>
  putDetailed(): Promise<AddResult>
}

// LINKS
// -----
export type Link = {
  name: string
  cid: CID
  size: number
  mtime?: number
  isFile: boolean
}

export type Links = { [name: string]: Link }

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
  removeDirectChild(name: string): this
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string): Promise<Tree | File>

  emptyChildTree(): Promise<Tree>
  createChildFile(content: FileContent): Promise<File>

  getLinks(): Links
}
