import * as Depot from "../components/depot/implementation.js"
import * as Manners from "../components/manners/implementation.js"

import * as Path from "../path/index.js"

import { CID } from "../common/cid.js"
import { Partition, Partitioned } from "../path/index.js"
import { Ticket } from "../ticket/types.js"

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

/** @group File System */
export type DataRootUpdater = (
  dataRoot: CID,
  proofs: Ticket[]
) => Promise<{ updated: true } | { updated: false; reason: string }>

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

/** @group File System */
export type FileSystemCarrier = {
  dataRoot?: CID
  dataRootUpdater?: DataRootUpdater
  futile?: boolean
  id: { did: string } | { name: string }
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
export type MutationType = "added-or-updated" | "removed"

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
  capsuleKey: Uint8Array
}

/** @group File System */
export type TransactionResult = {
  changes: { path: Path.Distinctive<Partitioned<Partition>>; type: MutationType }[]
  dataRoot: CID
  publishingStatus: Promise<PublishingStatus>
}

/** @group File System */
export type PublishingStatus =
  | { persisted: true }
  | { persisted: false; reason: string }
