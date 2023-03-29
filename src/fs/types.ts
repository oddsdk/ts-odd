import * as Events from "../events.js"
import * as Path from "../path/index.js"

import { CID } from "../common/cid.js"
import { EventEmitter } from "../events.js"
import { Partition, Partitioned } from "../path/index.js"
import { Crypto, Depot, Manners, Reference } from "../components.js"


export type AnySupportedDataType<V>
  = Uint8Array | Record<string | number | symbol, V> | string

export type AssociatedIdentity = {
  rootDID: string
  username?: string
}

export type DataRootChange = {
  dataRoot: CID
  publishingStatus: Promise<PublishingStatus>
}

export type DataType
  = "bytes" | "json" | "utf8"

export type DataForType<D extends DataType, V = unknown>
  = D extends "bytes" ? Uint8Array
  : D extends "json" ? Record<string | number | symbol, V>
  : D extends "utf8" ? string
  : never

export type Dependencies = {
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation
}

export type DirectoryItem = {
  metadata: { created: number, modified: number }
  name: string
}

export type DirectoryItemWithKind = DirectoryItem & {
  kind: Path.Kind
  path: Path.Distinctive<Path.PartitionedNonEmpty<Partition>>
}

export type FileSystemOptions = {
  account: AssociatedIdentity
  dependencies: Dependencies
  eventEmitter: EventEmitter<Events.FileSystem>
  localOnly?: boolean
  settleTimeBeforePublish?: number
}

export type MutationOptions = {
  skipPublish?: boolean
}

export type MutationResult<P extends Partition>
  = P extends Path.Public ? PublicMutationResult
  : P extends Path.Private ? PrivateMutationResult
  : never

export type PartitionDiscovery<P extends Partition>
  = P extends Path.Public ? { name: "public", path: Path.File<Path.Partitioned<Path.Public>>, segments: Path.Segments }
  : P extends Path.Private ? { name: "private", path: Path.File<Path.Partitioned<Path.Private>>, segments: Path.Segments }
  : never

export type PartitionDiscoveryNonEmpty<P extends Partition>
  = P extends Path.Public ? { name: "public", path: Path.File<Path.PartitionedNonEmpty<Path.Public>>, segments: Path.Segments }
  : P extends Path.Private ? { name: "private", path: Path.File<Path.PartitionedNonEmpty<Path.Private>>, segments: Path.Segments }
  : never



export type PublicMutationResult = DataRootChange & {
  capsuleCID: CID
  contentCID: CID
}

export type PrivateMutationResult = DataRootChange & {
  capsuleRef: PrivateReference
}

export type PrivateReference = {
  label: Uint8Array
  temporalKey: Uint8Array
  contentCID: CID
}

export type TransactionResult = {
  changedPaths: Path.Distinctive<Partitioned<Partition>>[],
  dataRoot: CID
  publishingStatus: Promise<PublishingStatus>
}

export type PublishingStatus
  = { persisted: true, localOnly: boolean }
  | { persisted: false, reason: "NO_INTERNET_CONNECTION" }
  | { persisted: false, reason: "DATA_ROOT_UPDATE_FAILED" }
  | { persisted: false, reason: "DISABLED_BY_OPTIONS" }
