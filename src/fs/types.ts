import type { CID } from "multiformats/cid"

import { Maybe } from "../common/index.js"
import { AddResult } from "../components/depot/implementation.js"
import { Path } from "../path/index.js"
import { Ucan } from "../ucan/types.js"


// FILE
// -----

export interface File extends Puttable {
  content: Uint8Array
  updateContent(content: Uint8Array): Promise<this>
}



// LINKS
// -----

export interface SimpleLink {
  name: string
  size: number
  cid: CID | string
}

export interface BaseLink {
  name: string
  size: number
  isFile: boolean
}

export interface SoftLink {
  ipns: string
  name: string
  key?: string
  privateName?: string
}

export interface HardLink extends SimpleLink, BaseLink { }
export type Link = HardLink | SoftLink | BaseLink

export interface SimpleLinks { [ name: string ]: SimpleLink }
export interface BaseLinks { [ name: string ]: BaseLink }
export interface HardLinks { [ name: string ]: HardLink }
export interface Links { [ name: string ]: Link }



// MISC
// ----

export type NonEmptyPath = [ string, ...string[] ]

export interface Puttable {
  put(): Promise<CID>
  putDetailed(): Promise<AddResult>
}

export type UpdateCallback = () => Promise<unknown>
export type PublishHook = (result: CID, proof: Ucan) => unknown
export type SharedBy = { rootDid: string; username: string }
export type ShareDetails = { shareId: string; sharedBy: SharedBy }
export type PuttableUnixTree = UnixTree & Puttable


// TREE
// ----

export interface UnixTree {
  readOnly: boolean

  ls(path: Path): Promise<Links>
  mkdir(path: Path): Promise<this>
  cat(path: Path): Promise<Uint8Array>
  add(path: Path, content: Uint8Array): Promise<this>
  rm(path: Path): Promise<this>
  mv(from: Path, to: Path): Promise<this>
  get(path: Path): Promise<PuttableUnixTree | File | null>
  exists(path: Path): Promise<boolean>
}

export interface Tree extends UnixTree, Puttable {
  createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree>
  createOrUpdateChildFile(content: Uint8Array, name: string, onUpdate: Maybe<UpdateCallback>): Promise<File>

  mkdirRecurse(path: Path, onUpdate: Maybe<UpdateCallback>): Promise<this>
  addRecurse(path: Path, content: Uint8Array, onUpdate: Maybe<UpdateCallback>): Promise<this>
  rmRecurse(path: Path, onUpdate: Maybe<UpdateCallback>): Promise<this>

  updateChild(child: Tree | File, path: Path): Promise<this>
  updateDirectChild(child: Tree | File, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this>
  removeDirectChild(name: string): this
  get(path: Path): Promise<Tree | File | null>
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree | File>

  updateLink(name: string, result: AddResult): this
  getLinks(): Links
}
