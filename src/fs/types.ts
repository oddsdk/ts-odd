import { Maybe } from "../common/index.js"
import { FileContent, CID, AddResult } from "../ipfs/index.js"
import { Path } from "../path.js"


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
  isFile: boolean
}

export interface SoftLink {
  ipns: string
  name: string
  key?: string
  privateName?: string
}

export interface HardLink extends SimpleLink, BaseLink {}
export type Link = HardLink | SoftLink | BaseLink

export interface SimpleLinks { [name: string]: SimpleLink }
export interface BaseLinks { [name: string]: BaseLink }
export interface HardLinks { [name: string]: HardLink }
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
export type SharedBy = { did: string, username: string }
export type ShareDetails = { shareId: string, sharedBy: SharedBy }



// TREE
// ----

export interface UnixTree {
  readOnly: boolean

  ls(path: Path): Promise<Links>
  mkdir(path: Path, onUpdate?: UpdateCallback): Promise<this>
  cat(path: Path): Promise<FileContent>
  add(path: Path, content: FileContent): Promise<this>
  rm(path: Path): Promise<this>
  mv(from: Path, to: Path): Promise<this>
  get(path: Path): Promise<Tree | File | null>
  exists(path: Path): Promise<boolean>
}

export interface Tree extends UnixTree, Puttable {
  createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree>
  createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<File>

  mkdirRecurse(path: Path, onUpdate: Maybe<UpdateCallback>): Promise<this>
  addRecurse(path: Path, content: FileContent, onUpdate: Maybe<UpdateCallback>): Promise<this>
  rmRecurse(path: Path, onUpdate: Maybe<UpdateCallback>): Promise<this>

  updateChild(child: Tree | File, path: Path): Promise<this>
  updateDirectChild(child: Tree | File, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this>
  removeDirectChild(name: string): this
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree | File>

  updateLink(name: string, result: AddResult): this
  getLinks(): Links
}
