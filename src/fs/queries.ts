import * as Uint8arrays from "uint8arrays"
import { BlockStore, PrivateDirectory, PrivateFile, PrivateNode, PrivateRef, PublicDirectory, PublicNode } from "wnfs"
import { exporter as exportUnixFs } from "ipfs-unixfs-exporter"
import all from "it-all"

import * as Path from "../path/index.js"

import { CID } from "../common/cid.js"
import { Dependencies, DirectoryItem, DirectoryItemWithKind } from "./types.js"
import { MountedPrivateNodes, PrivateNodeQueryResult } from "./types/internal.js"
import { Partitioned } from "../path/index.js"
import { RootTree } from "./rootTree.js"
import { Rng } from "./rng.js"
import { searchLatest } from "./common.js"
import { findPrivateNode } from "./mounts.js"


// PUBLIC


export type PublicParams = {
  blockStore: BlockStore
  dependencies: Dependencies
  pathSegments: Path.Segments
  rootTree: RootTree
}


export type Public<T> = (params: PublicParams) => Promise<T>
export type PublicContext = Omit<PublicParams, "pathSegments">


export async function publicQuery<T>(
  path: Path.Distinctive<Partitioned<Path.Public>>,
  qry: Public<T>,
  context: PublicContext
): Promise<T> {
  return qry({
    blockStore: context.blockStore,
    dependencies: context.dependencies,
    pathSegments: Path.unwrap(Path.removePartition(path)),
    rootTree: context.rootTree
  })
}


export const publicExists =
  () =>
    async (params: PublicParams): Promise<boolean> => {
      const result = await params.rootTree.publicRoot.getNode(
        params.pathSegments,
        params.blockStore
      )

      return !!result
    }


export const publicListDirectory =
  () =>
    async (params: PublicParams): Promise<DirectoryItem[]> => {
      return params.rootTree.publicRoot.ls(
        params.pathSegments,
        params.blockStore
      )
    }


export const publicListDirectoryWithKind =
  () =>
    async (params: PublicParams): Promise<DirectoryItemWithKind[]> => {
      const dir: PublicDirectory = await params.rootTree.publicRoot.getNode(params.pathSegments, params.blockStore).then(a => a.asDir())
      const items: DirectoryItem[] = await dir.ls([], params.blockStore)

      const promises = items.map(async (item): Promise<DirectoryItemWithKind> => {
        const node: PublicNode = await dir.lookupNode(item.name, params.blockStore)
        const kind = node.isDir() ? Path.Kind.Directory : Path.Kind.File

        return {
          ...item,
          kind,
          path: Path.combine(
            Path.directory("public", ...params.pathSegments),
            Path.fromKind(kind, item.name)
          ),
        }
      })

      return Promise.all(promises)
    }


export const publicRead =
  (options?: { offset: number, length: number }) =>
    async (params: PublicParams): Promise<Uint8Array> => {
      const result = await params.rootTree.publicRoot.read(
        params.pathSegments,
        params.blockStore
      )

      return publicReadFromCID(CID.decode(result), options)(params)
    }


export const publicReadFromCID =
  (cid: CID, options?: { offset: number, length: number }) =>
    async (context: PublicContext): Promise<Uint8Array> => {
      const offset = options?.offset
      const length = options?.length

      const fsEntry = await exportUnixFs(cid, context.dependencies.depot.blockstore)

      if (fsEntry.type === "file" || fsEntry.type === "raw") {
        return Uint8arrays.concat(
          await all(fsEntry.content({ offset, length }))
        )
      } else {
        throw new Error(`Expected a file, found a '${fsEntry.type}' (CID: ${cid.toString()})`)
      }
    }



// PRIVATE


export type PrivateParams = {
  blockStore: BlockStore
  privateNodes: MountedPrivateNodes
  rng: Rng
  rootTree: RootTree
} & PrivateNodeQueryResult


export type Private<T> = (params: PrivateParams) => Promise<T>
export type PrivateContext = Omit<PrivateParams, keyof PrivateNodeQueryResult>


export async function privateQuery<T>(
  path: Path.Distinctive<Partitioned<Path.Private>>,
  qry: Private<T>,
  context: PrivateContext
): Promise<T> {
  const priv = findPrivateNode(path, context.privateNodes)

  // Perform mutation
  return qry({
    ...priv,
    blockStore: context.blockStore,
    privateNodes: context.privateNodes,
    rng: context.rng,
    rootTree: context.rootTree,
  })
}


export const privateExists =
  () =>
    async (params: PrivateParams): Promise<boolean> => {
      if (params.node.isFile()) return true

      const { result } = await params.node.asDir().getNode(
        params.remainder,
        searchLatest(),
        params.rootTree.privateForest,
        params.blockStore
      )

      return !!result
    }


export const privateListDirectory =
  () =>
    async (params: PrivateParams): Promise<DirectoryItem[]> => {
      if (params.node.isFile()) throw new Error("Cannot list a file")
      const { result } = await params.node.asDir().ls(params.remainder, searchLatest(), params.rootTree.privateForest, params.blockStore)
      return result
    }


export const privateListDirectoryWithKind =
  () =>
    async (params: PrivateParams): Promise<DirectoryItemWithKind[]> => {
      if (params.node.isFile()) throw new Error("Cannot list a file")

      const dir: PrivateDirectory = await params.node.asDir().getNode(params.remainder, searchLatest(), params.rootTree.privateForest, params.blockStore).then(a => a.result.asDir())
      const items: DirectoryItem[] = await dir.ls([], searchLatest(), params.rootTree.privateForest, params.blockStore)

      const parentPath = Path.combine(
        Path.directory("private", ...Path.unwrap(params.path)),
        Path.directory(...params.remainder)
      )

      if (!Path.isDirectory(parentPath)) {
        throw new Error("Didn't expect a file path")
      }

      const promises = items.map(async (item: DirectoryItem): Promise<DirectoryItemWithKind> => {
        const node: PrivateNode = await dir.lookupNode(item.name, searchLatest(), params.rootTree.privateForest, params.blockStore).then(a => a.result)
        const kind = node.isDir() ? Path.Kind.Directory : Path.Kind.File

        return {
          ...item,
          kind,
          path: Path.combine(
            parentPath,
            Path.fromKind(kind, item.name)
          ),
        }
      })

      return Promise.all(promises)
    }


export const privateRead =
  (options?: { offset: number, length: number }) =>
    async (params: PrivateParams): Promise<Uint8Array> => {
      // TODO: Respect `offset` and `length` options when private streaming API is exposed in rs-wnfs
      const offset = options?.offset
      const length = options?.length

      let bytes

      if (params.node.isFile()) {
        bytes = await params.node.asFile().getContent(params.rootTree.privateForest, params.blockStore)
      } else {
        const { result } = await params.node.asDir().read(params.remainder, searchLatest(), params.rootTree.privateForest, params.blockStore)
        bytes = result
      }

      return bytes
    }


export const privateReadFromReference =
  (ref: PrivateRef, options?: { offset: number, length: number }) =>
    async (context: PrivateContext): Promise<Uint8Array> => {
      // TODO: Respect `offset` and `length` options when private streaming API is exposed in rs-wnfs
      const offset = options?.offset
      const length = options?.length

      // Retrieve node
      const node = await PrivateNode.load(
        ref,
        context.rootTree.privateForest,
        context.blockStore
      )

      if (node.isFile()) {
        const file: PrivateFile = node.asFile()

        // TODO: Respect the offset and length options when available in rs-wnfs
        return file.getContent(context.rootTree.privateForest, context.blockStore)

      } else {
        throw new Error("Expected a file, found a directory")

      }
    }