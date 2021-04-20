import { Maybe } from '../common'
import { FileContent, CID, AddResult } from '../ipfs'
import { SemVer } from './semver'


// FILE
// -----

export interface File extends Puttable {
  content: FileContent
  updateContent(content: FileContent): Promise<this>
}



// LINKS
// -----

export interface SimpleLink {
  name: string
  size: number
  cid: CID
}

export interface BaseLink {
  name: string
  size: number
  mtime?: number
  isFile: boolean
}

export interface Link extends SimpleLink, BaseLink {}

export interface SimpleLinks { [name: string]: SimpleLink }
export interface BaseLinks { [name: string]: BaseLink }
export interface Links { [name: string]: Link }



// MISC
// ----

export enum Branch {
  Public = 'public',
  Pretty = 'p',
  Private = 'private',
  PrivateLog = 'privateLog',
  Version = 'version'
}

export type NonEmptyPath = [string, ...string[]]

export interface Puttable {
  put(): Promise<CID>
  putDetailed(): Promise<AddResult>
}

export type UpdateCallback = () => Promise<unknown>

export type PublishHook = (result: CID, proof: string) => unknown



// TREE
// ----

export interface UnixTree {
  ls(path: string): Promise<BaseLinks>
  mkdir(path: string, onUpdate?: UpdateCallback): Promise<this>
  cat(path: string): Promise<FileContent>
  add(path: string, content: FileContent): Promise<this>
  rm(path: string): Promise<this>
  mv(from: string, to: string): Promise<this>
  get(path: string): Promise<Tree | File | null>
  exists(path: string): Promise<boolean>
}

export interface Tree extends UnixTree, Puttable {
  version: SemVer

  createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree>
  createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<File>

  mkdirRecurse(path: string, onUpdate: Maybe<UpdateCallback>): Promise<this>
  addRecurse(path: string, content: FileContent, onUpdate: Maybe<UpdateCallback>): Promise<this>
  rmRecurse(path: string, onUpdate: Maybe<UpdateCallback>): Promise<this>

  updateDirectChild(child: Tree | File, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this>
  removeDirectChild(name: string): this
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree | File>

  updateLink(name: string, result: AddResult): this
  getLinks(): BaseLinks
}
