import type { Mtime } from 'ipfs-unixfs'
import { Maybe } from '../common/index'
import { FileContent, CID, AddResult } from '../ipfs/index'
import { Path } from '../path'
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
  mtime?: Mtime
  isFile: boolean
}

export interface Link extends SimpleLink, BaseLink {}

export interface SimpleLinks { [name: string]: SimpleLink }
export interface BaseLinks { [name: string]: BaseLink }
export interface Links { [name: string]: Link }



// MISC
// ----

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
  ls(path: Path): Promise<BaseLinks>
  mkdir(path: Path, onUpdate?: UpdateCallback): Promise<this>
  cat(path: Path): Promise<FileContent>
  add(path: Path, content: FileContent): Promise<this>
  rm(path: Path): Promise<this>
  mv(from: Path, to: Path): Promise<this>
  get(path: Path): Promise<Tree | File | null>
  exists(path: Path): Promise<boolean>
}

export interface Tree extends UnixTree, Puttable {
  version: SemVer

  createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree>
  createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<File>

  mkdirRecurse(path: Path, onUpdate: Maybe<UpdateCallback>): Promise<this>
  addRecurse(path: Path, content: FileContent, onUpdate: Maybe<UpdateCallback>): Promise<this>
  rmRecurse(path: Path, onUpdate: Maybe<UpdateCallback>): Promise<this>

  updateDirectChild(child: Tree | File, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this>
  removeDirectChild(name: string): this
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree | File>

  updateLink(name: string, result: AddResult): this
  getLinks(): BaseLinks
}
