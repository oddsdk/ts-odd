import type { CID } from "multiformats/cid"

import * as Path from "../path/index.js"

import { Maybe } from "../common/index.js"
import { PutResult } from "../components/depot/implementation.js"
import { DirectoryPath, DistinctivePath, FilePath, Partitioned, PartitionedNonEmpty, Partition } from "../path/index.js"
import { Ucan } from "../ucan/types.js"


// 💾 TOP LEVEL
// ------------

export type API = Persistence & Properties & Posix & Sharing

export interface Persistence {
  historyStep(): Promise<void>
  publish(): Promise<CID>
}

export interface Properties {
  account: AssociatedIdentity
}

export interface Posix {
  exists(path: DistinctivePath<PartitionedNonEmpty<Partition>>): Promise<boolean>
  get(path: DistinctivePath<Partitioned<Partition>>): Promise<PuttableUnixTree | File | null>
  mv(from: DistinctivePath<PartitionedNonEmpty<Partition>>, to: DistinctivePath<PartitionedNonEmpty<Partition>>): Promise<this>
  rm(path: DistinctivePath<PartitionedNonEmpty<Partition>>): Promise<this>

  resolveSymlink(link: SoftLink): Promise<File | Tree | null>
  symlink(args: {
    at: DirectoryPath<PartitionedNonEmpty<Partition>>
    referringTo: {
      path: Path.Distinctive<Partitioned<Partition>>
      username?: string
    }
    name: string
  }): Promise<this>

  // Directories
  ls(path: DirectoryPath<Partitioned<Partition>>): Promise<Links>
  mkdir(path: DirectoryPath<PartitionedNonEmpty<Partition>>, options?: MutationOptions): Promise<this>

  // Files
  write(
    path: DistinctivePath<PartitionedNonEmpty<Partition>>,
    content: Uint8Array | SoftLink | SoftLink[] | Record<string, SoftLink>,
    options?: MutationOptions
  ): Promise<this>

  read(path: FilePath<PartitionedNonEmpty<Partition>>): Promise<Uint8Array | null>
}

export interface Sharing {
  acceptShare({ shareId, sharedBy }: { shareId: string; sharedBy: string }): Promise<this>
  loadShare({ shareId, sharedBy }: { shareId: string; sharedBy: string }): Promise<UnixTree>
  sharePrivate(paths: DistinctivePath<Path.PartitionedNonEmpty<Path.Private>>[], { sharedBy, shareWith }: { sharedBy?: SharedBy; shareWith: string | string[] }): Promise<ShareDetails>
}



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

export type AssociatedIdentity = {
  rootDID: string
  username?: string
}

export type NonEmptyPath = [ string, ...string[] ]

export interface Puttable {
  put(): Promise<CID>
  putDetailed(): Promise<PutResult>
}

export type UpdateCallback = () => Promise<unknown>
export type PublishHook = (result: CID, proof: Ucan) => unknown
export type SharedBy = { rootDid: string; username: string }
export type ShareDetails = { shareId: string; sharedBy: SharedBy }
export type PuttableUnixTree = UnixTree & Puttable



// OPTIONS
// -------

export type MutationOptions = {
  publish?: boolean
}



// TREE
// ----

export interface UnixTree {
  readOnly: boolean

  ls(path: Path.Segments): Promise<Links>
  mkdir(path: Path.Segments): Promise<this>
  cat(path: Path.Segments): Promise<Uint8Array>
  add(path: Path.Segments, content: Uint8Array): Promise<this>
  rm(path: Path.Segments): Promise<this>
  mv(from: Path.Segments, to: Path.Segments): Promise<this>
  get(path: Path.Segments): Promise<PuttableUnixTree | File | null>
  exists(path: Path.Segments): Promise<boolean>
}

export interface Tree extends UnixTree, Puttable {
  createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree>
  createOrUpdateChildFile(content: Uint8Array, name: string, onUpdate: Maybe<UpdateCallback>): Promise<File>

  mkdirRecurse(path: Path.Segments, onUpdate: Maybe<UpdateCallback>): Promise<this>
  addRecurse(path: Path.Segments, content: Uint8Array, onUpdate: Maybe<UpdateCallback>): Promise<this>
  rmRecurse(path: Path.Segments, onUpdate: Maybe<UpdateCallback>): Promise<this>

  updateChild(child: Tree | File, path: Path.Segments): Promise<this>
  updateDirectChild(child: Tree | File, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this>
  removeDirectChild(name: string): this
  get(path: Path.Segments): Promise<Tree | File | null>
  getDirectChild(name: string): Promise<Tree | File | null>
  getOrCreateDirectChild(name: string, onUpdate: Maybe<UpdateCallback>): Promise<Tree | File>

  updateLink(name: string, result: PutResult): this
  getLinks(): Links
}
