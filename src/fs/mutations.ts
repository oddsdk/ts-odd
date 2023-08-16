import { BlockStore } from "wnfs"

import * as Path from "../path/index.js"
import * as Unix from "./unix.js"

import { searchLatest } from "./common.js"
import { Rng } from "./rng.js"
import { RootTree } from "./rootTree.js"
import { Dependencies, MutationType } from "./types.js"
import { MountedPrivateNodes, PrivateNodeQueryResult, WnfsPrivateResult, WnfsPublicResult } from "./types/internal.js"

////////
// 🏔️ //
////////

export const TYPES: Record<string, MutationType> = {
  ADDED_OR_UPDATED: "added-or-updated",
  REMOVED: "removed",
}

////////////
// PUBLIC //
////////////

export type PublicParams<FS> = {
  blockStore: BlockStore
  dependencies: Dependencies<FS>
  pathSegments: Path.Segments
  rootTree: RootTree
}

export type Public = <FS>(params: PublicParams<FS>) => Promise<WnfsPublicResult>

export const publicCreateDirectory = () => async <FS>(params: PublicParams<FS>): Promise<WnfsPublicResult> => {
  return params.rootTree.publicRoot.mkdir(
    params.pathSegments,
    new Date(),
    params.blockStore
  )
}

export const publicRemove = () => async <FS>(params: PublicParams<FS>): Promise<WnfsPublicResult> => {
  return params.rootTree.publicRoot.rm(
    params.pathSegments,
    params.blockStore
  )
}

export const publicWrite = (bytes: Uint8Array) => async <FS>(params: PublicParams<FS>): Promise<WnfsPublicResult> => {
  const cid = await Unix.importFile(bytes, params.dependencies.depot)

  return params.rootTree.publicRoot.write(
    params.pathSegments,
    cid.bytes,
    new Date(),
    params.blockStore
  )
}

/////////////
// PRIVATE //
/////////////

export type PrivateParams = {
  blockStore: BlockStore
  privateNodes: MountedPrivateNodes
  rng: Rng
  rootTree: RootTree
} & PrivateNodeQueryResult

export type Private = (params: PrivateParams) => Promise<WnfsPrivateResult>

export const privateCreateDirectory = () => (params: PrivateParams): Promise<WnfsPrivateResult> => {
  if (params.node.isFile()) throw new Error("Cannot create a directory inside a file")

  return params.node.asDir().mkdir(
    params.remainder,
    searchLatest(),
    new Date(),
    params.rootTree.privateForest,
    params.blockStore,
    params.rng
  )
}

export const privateRemove = () => (params: PrivateParams): Promise<WnfsPrivateResult> => {
  if (params.node.isFile()) {
    throw new Error("Cannot self-destruct")
  }

  return params.node.asDir().rm(
    params.remainder,
    searchLatest(),
    params.rootTree.privateForest,
    params.blockStore
  )
}

export const privateWrite = (bytes: Uint8Array) => (params: PrivateParams): Promise<WnfsPrivateResult> => {
  if (params.node.isFile()) {
    throw new Error("Cannot write into a PrivateFile directly")
  }

  return params.node.asDir().write(
    params.remainder,
    searchLatest(),
    bytes,
    new Date(),
    params.rootTree.privateForest,
    params.blockStore,
    params.rng
  )
}
