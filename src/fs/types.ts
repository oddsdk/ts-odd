import type { Repo as CIDLog } from "../repositories/cid-log.js"

import * as Depot from "../components/depot/implementation.js"
import * as Manners from "../components/manners/implementation.js"

import * as Path from "../path/index.js"

import { CID } from "../common/cid.js"
import { Partition, Partitioned } from "../path/index.js"
import { Dictionary } from "../ucan/dictionary.js"
import { Ucan } from "../ucan/types.js"
import { PrivateReference } from "./types/private-ref.js"

////////
// 🧩 //
////////

/** @group File System */
export type AnySupportedDataType<V> = Uint8Array | Record<string | number | symbol, V> | string

/** @group File System */
export type DataRootChange = {
  dataRoot: CID
  publishingStatus: Promise<PublishingStatus>
}

/** @group File System */
export type DataType = "bytes" | "json" | "utf8"

/** @group File System */
export type DataForType<D extends DataType, V = unknown> = D extends "bytes" ? Uint8Array
  : D extends "json" ? Record<string | number | symbol, V>
  : D extends "utf8" ? string
  : never

/** @internal */
export type Dependencies<FS> = {
  depot: Depot.Implementation
  manners: Manners.Implementation<FS>
}

/** @group File System */
export type DirectoryItem = {
  metadata: { created: number; modified: number }
  name: string
}

/** @group File System */
export type DirectoryItemWithKind = DirectoryItem & {
  kind: Path.Kind
  path: Path.Distinctive<Path.PartitionedNonEmpty<Partition>>
}

/** @internal */
export type FileSystemOptions<FS> = {
  cidLog: CIDLog
  dependencies: Dependencies<FS>
  did: string
  settleTimeBeforePublish?: number
  ucanDictionary: Dictionary
  updateDataRoot?: (dataRoot: CID, proofs: Ucan[]) => Promise<{ updated: true } | { updated: false; reason: string }>
}

/** @group File System */
export type MutationOptions = {
  skipPublish?: boolean
}

/** @group File System */
export type MutationResult<P extends Partition> = P extends Path.Public ? PublicMutationResult
  : P extends Path.Private ? PrivateMutationResult
  : never

/** @group File System */
export type PartitionDiscovery<P extends Partition> = P extends Path.Public
  ? { name: "public"; path: Path.File<Path.Partitioned<Path.Public>>; segments: Path.Segments }
  : P extends Path.Private
    ? { name: "private"; path: Path.File<Path.Partitioned<Path.Private>>; segments: Path.Segments }
  : never

/** @group File System */
export type PartitionDiscoveryNonEmpty<P extends Partition> = P extends Path.Public
  ? { name: "public"; path: Path.File<Path.PartitionedNonEmpty<Path.Public>>; segments: Path.Segments }
  : P extends Path.Private
    ? { name: "private"; path: Path.File<Path.PartitionedNonEmpty<Path.Private>>; segments: Path.Segments }
  : never

/** @group File System */
export type PublicMutationResult = DataRootChange & {
  capsuleCID: CID
  contentCID: CID
}

/** @group File System */
export type PrivateMutationResult = DataRootChange & {
  capsuleRef: PrivateReference
}

/** @group File System */
export type TransactionResult = {
  changedPaths: Path.Distinctive<Partitioned<Partition>>[]
  dataRoot: CID
  publishingStatus: Promise<PublishingStatus>
}

/** @group File System */
export type PublishingStatus =
  | { persisted: true }
  | { persisted: false; reason: string }
