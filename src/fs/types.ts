import { FileContent, CID, AddResult } from '../ipfs'
import { SemVer } from './semver'


// LINKS
// -----

export type BaseLink = {
  name: string
  size: number
  mtime?: number
  isFile: boolean
}

export type Link = BaseLink & {
  cid: CID
}

export type BaseLinks = { [name: string]: BaseLink }
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
export type SyncHook = (result: CID, proof: string) => unknown
export type SyncHookDetailed = (result: AddResult) => unknown


// FILE
// -----

export interface File {
  content: FileContent
  put(): Promise<CID>
  putDetailed(): Promise<AddResult>
}


// TREE
// ----

export interface UnixTree {
  ls(path: string): Promise<BaseLinks>
  mkdir(path: string): Promise<this>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<this>
  rm(path: string): Promise<this>
  mv(from: string, to: string): Promise<this>
  get(path: string): Promise<Tree | File | null>
  exists(path: string): Promise<boolean>
}

export interface Tree extends UnixTree {
  version: SemVer

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

  getLinks(): BaseLinks
}
