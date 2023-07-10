import type { Repo as CIDLog } from "../repositories/cid-log.js"
import type { Repo as UcanRepo } from "../repositories/ucans.js"

import * as Account from "../components/account/implementation.js"
import * as Agent from "../components/agent/implementation.js"
import * as Depot from "../components/depot/implementation.js"
import * as Identifier from "../components/identifier/implementation.js"
import * as Manners from "../components/manners/implementation.js"

import * as Events from "../events.js"
import * as Path from "../path/index.js"

import { CID } from "../common/cid.js"
import { EventEmitter } from "../events.js"
import { Partition, Partitioned } from "../path/index.js"
import { PrivateReference } from "./types/private-ref.js"


export type AnySupportedDataType<V>
  = Uint8Array | Record<string | number | symbol, V> | string

export type AssociatedAccount = {
  did: string
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

export type Dependencies<FS> = {
  account: Account.Implementation
  agent: Agent.Implementation
  depot: Depot.Implementation
  identifier: Identifier.Implementation
  manners: Manners.Implementation<FS>
}

export type DirectoryItem = {
  metadata: { created: number, modified: number }
  name: string
}

export type DirectoryItemWithKind = DirectoryItem & {
  kind: Path.Kind
  path: Path.Distinctive<Path.PartitionedNonEmpty<Partition>>
}

export type FileSystemOptions<FS> = {
  cidLog: CIDLog
  dependencies: Dependencies<FS>
  eventEmitter: EventEmitter<Events.FileSystem>
  localOnly?: boolean
  settleTimeBeforePublish?: number
  ucanRepository: UcanRepo
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
