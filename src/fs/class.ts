import debounce from "debounce-promise"
import { CID } from "multiformats/cid"
import { AccessKey, BlockStore, PrivateDirectory, PrivateFile, PrivateNode, PublicDirectory, PublicFile } from "wnfs"

import type { Repo as CIDLog } from "../repositories/cid-log.js"

import * as Events from "../events/fileSystem.js"
import * as Path from "../path/index.js"
import * as Rng from "./rng.js"
import * as RootTree from "./rootTree.js"
import * as Store from "./store.js"

import { EventEmitter, createEmitter } from "../events/emitter.js"
import { EventListener } from "../events/listen.js"
import { Inventory } from "../inventory.js"
import { Partition, Partitioned, PartitionedNonEmpty, Private, Public } from "../path/index.js"
import { Ticket } from "../ticket/types.js"
import { searchLatest } from "./common.js"
import { findPrivateNode, partition as determinePartition } from "./mounts.js"
import { TransactionContext } from "./transaction.js"
import {
  AnySupportedDataType,
  DataForType,
  DataRootChange,
  DataRootUpdater,
  DataType,
  Dependencies,
  DirectoryItem,
  DirectoryItemWithKind,
  MutationOptions,
  MutationResult,
  PrivateMutationResult,
  PublicMutationResult,
  PublishingStatus,
  TransactionResult,
} from "./types.js"
import { MountedPrivateNode, MountedPrivateNodes } from "./types/internal.js"

/** @internal */
export type FileSystemOptions<FS> = {
  cidLog: CIDLog
  dependencies: Dependencies<FS>
  did: string
  inventory: Inventory
  settleTimeBeforePublish?: number
  updateDataRoot?: DataRootUpdater
}

/** @group File System */
export class FileSystem {
  #blockStore: BlockStore
  #cidLog: CIDLog
  #dependencies: Dependencies<FileSystem>
  #eventEmitter: EventEmitter<Events.FileSystem>
  #inventory: Inventory
  #rootTree: RootTree.RootTree
  #settleTimeBeforePublish: number
  #updateDataRoot?: DataRootUpdater

  #privateNodes: MountedPrivateNodes = {}
  #rng: Rng.Rng

  did: string

  /** @hidden */
  constructor(
    blockStore: BlockStore,
    cidLog: CIDLog,
    dependencies: Dependencies<FileSystem>,
    did: string,
    inventory: Inventory,
    rootTree: RootTree.RootTree,
    settleTimeBeforePublish: number,
    updateDataRoot?: (
      dataRoot: CID,
      proofs: Ticket[]
    ) => Promise<{ updated: true } | { updated: false; reason: string }>
  ) {
    this.#blockStore = blockStore
    this.#cidLog = cidLog
    this.#dependencies = dependencies
    this.#inventory = inventory
    this.#settleTimeBeforePublish = settleTimeBeforePublish
    this.#rootTree = rootTree
    this.#updateDataRoot = updateDataRoot

    this.#eventEmitter = createEmitter<Events.FileSystem>()
    this.#rng = Rng.makeRngInterface()

    this.did = did
  }

  // INITIALISATION
  // --------------

  /**
   * Creates a file system with an empty public tree & an empty private tree at the root.
   * @internal
   */
  static async empty(opts: FileSystemOptions<FileSystem>): Promise<FileSystem> {
    const { cidLog, dependencies, did, inventory, settleTimeBeforePublish, updateDataRoot } = opts

    const blockStore = Store.fromDepot(dependencies.depot)
    const rootTree = await RootTree.empty()

    return new FileSystem(
      blockStore,
      cidLog,
      dependencies,
      did,
      inventory,
      rootTree,
      settleTimeBeforePublish || 2500,
      updateDataRoot
    )
  }

  /**
   * Loads an existing file system from a CID.
   * @internal
   */
  static async fromCID(cid: CID, opts: FileSystemOptions<FileSystem>): Promise<FileSystem> {
    const { cidLog, dependencies, did, inventory, settleTimeBeforePublish, updateDataRoot } = opts

    const blockStore = Store.fromDepot(dependencies.depot)
    const rootTree = await RootTree.fromCID({ blockStore, cid, depot: dependencies.depot })

    return new FileSystem(
      blockStore,
      cidLog,
      dependencies,
      did,
      inventory,
      rootTree,
      settleTimeBeforePublish || 2500,
      updateDataRoot
    )
  }

  // EVENTS
  // ------

  /**
   * {@inheritDoc events.EmitterClass.on}
   * @group Events
   */
  on = <Name extends keyof Events.FileSystem>(eventName: Name, listener: EventListener<Events.FileSystem, Name>) =>
    this.#eventEmitter.on(eventName, listener)

  /**
   * {@inheritDoc events.EmitterClass.onAny}
   * @group Events
   */
  onAny = (
    listener: (
      eventName: keyof Events.FileSystem,
      eventData: Events.FileSystem[keyof Events.FileSystem]
    ) => void | Promise<void>
  ) => this.#eventEmitter.onAny(listener)

  /**
   * {@inheritDoc events.EmitterClass.off}
   * @group Events
   */
  off = <Name extends keyof Events.FileSystem>(eventName: Name, listener: EventListener<Events.FileSystem, Name>) =>
    this.#eventEmitter.off(eventName, listener)

  /**
   * {@inheritDoc events.EmitterClass.offAny}
   * @group Events
   */
  offAny = (
    listener: (
      eventName: keyof Events.FileSystem,
      eventData: Events.FileSystem[keyof Events.FileSystem]
    ) => void | Promise<void>
  ) => this.#eventEmitter.offAny(listener)

  /**
   * {@inheritDoc events.EmitterClass.once}
   * @group Events
   */
  once = <Name extends keyof Events.FileSystem>(eventName: Name) => this.#eventEmitter.once(eventName)

  /**
   * {@inheritDoc events.EmitterClass.anyEvent}
   * @group Events
   */
  anyEvent = () => this.#eventEmitter.anyEvent()

  /**
   * {@inheritDoc events.EmitterClass.events}
   * @group Events
   */
  events = <Name extends keyof Events.FileSystem>(eventName: Name) => this.#eventEmitter.events(eventName)

  // MOUNTS
  // ------

  /**
   * Mount a private node onto the file system.
   * @group Mounting
   */
  async mountPrivateNode(node: {
    path: Path.Distinctive<Path.Segments>
    capsuleKey?: Uint8Array
  }): Promise<{
    path: Path.Distinctive<Path.Segments>
    capsuleKey: Uint8Array
  }> {
    const mounts = await this.mountPrivateNodes([node])
    return mounts[0]
  }

  /**
   * Mount private nodes onto the file system.
   * @group Mounting
   */
  async mountPrivateNodes(
    nodes: {
      path: Path.Distinctive<Path.Segments>
      capsuleKey?: Uint8Array
    }[]
  ): Promise<{
    path: Path.Distinctive<Path.Segments>
    capsuleKey: Uint8Array
  }[]> {
    const newNodes = await Promise.all(
      nodes.map(async ({ path, capsuleKey }): Promise<[string, MountedPrivateNode]> => {
        let privateNode: PrivateNode

        if (capsuleKey) {
          const accessKey = AccessKey.fromBytes(capsuleKey)
          privateNode = await PrivateNode.load(accessKey, this.#rootTree.privateForest, this.#blockStore)
        } else {
          privateNode = Path.isFile(path)
            ? new PrivateFile(this.#rootTree.privateForest.emptyName(), new Date(), this.#rng).asNode()
            : new PrivateDirectory(this.#rootTree.privateForest.emptyName(), new Date(), this.#rng).asNode()
        }

        return [
          // Use absolute paths so that you can retrieve the root: privateNodes["/"]
          Path.toPosix(path, { absolute: true }),
          { node: privateNode, path },
        ]
      })
    )

    this.#privateNodes = {
      ...this.#privateNodes,
      ...Object.fromEntries(newNodes),
    }

    return Promise.all(
      newNodes.map(async ([_, n]: [string, MountedPrivateNode]) => {
        const storeResult = await n.node.store(this.#rootTree.privateForest, this.#blockStore, this.#rng)
        const [accessKey, privateForest] = storeResult

        this.#rootTree = { ...this.#rootTree, privateForest }

        return {
          path: n.path,
          capsuleKey: accessKey.toBytes(),
        }
      })
    )
  }

  /**
   * Unmount a private node from the file system.
   * @group Mounting
   */
  unmountPrivateNode(path: Path.Distinctive<Path.Segments>): void {
    delete this.#privateNodes[Path.toPosix(path)]
  }

  // QUERY
  // -----

  /** @group Querying */
  async contentCID(path: Path.File<Partitioned<Public>>): Promise<CID | null> {
    return this.#transactionContext().contentCID(path)
  }

  /** @group Querying */
  async capsuleCID(path: Path.Distinctive<Partitioned<Public>>): Promise<CID | null> {
    return this.#transactionContext().capsuleCID(path)
  }

  /** @group Querying */
  async capsuleKey(path: Path.Distinctive<Partitioned<Private>>): Promise<Uint8Array | null> {
    return this.#transactionContext().capsuleKey(path)
  }

  /** @group Querying */
  async exists(path: Path.Distinctive<Partitioned<Partition>>): Promise<boolean> {
    return this.#transactionContext().exists(path)
  }

  /** @group Querying */
  async listDirectory(
    path: Path.Directory<Partitioned<Partition>>,
    listOptions: { withItemKind: true }
  ): Promise<DirectoryItemWithKind[]>
  async listDirectory(
    path: Path.Directory<Partitioned<Partition>>,
    listOptions: { withItemKind: false }
  ): Promise<DirectoryItem[]>
  async listDirectory(
    path: Path.Directory<Partitioned<Partition>>
  ): Promise<DirectoryItem[]>
  async listDirectory(
    path: Path.Directory<Partitioned<Partition>>,
    listOptions: { withItemKind: boolean } = { withItemKind: false }
  ): Promise<DirectoryItem[] | DirectoryItemWithKind[]> {
    return this.#transactionContext().listDirectory(path, listOptions)
  }

  /** @group Querying */
  ls = this.listDirectory

  /** @group Querying */
  async read<
    D extends DataType,
    V = unknown,
  >(
    path: Path.File<PartitionedNonEmpty<Partition>> | { contentCID: CID } | { capsuleCID: CID } | {
      capsuleKey: Uint8Array
    },
    dataType: D,
    options?: { offset: number; length: number }
  ): Promise<DataForType<D, V>>
  async read<V = unknown>(
    path: Path.File<PartitionedNonEmpty<Partition>> | { contentCID: CID } | { capsuleCID: CID } | {
      capsuleKey: Uint8Array
    },
    dataType: DataType,
    options?: { offset: number; length: number }
  ): Promise<AnySupportedDataType<V>> {
    return this.#transactionContext().read<DataType, V>(path, dataType, options)
  }

  /**
   * Create a permalink to some public file system content.
   * @group Querying
   */
  permalink(dataRoot: CID, path: Path.Distinctive<Path.Partitioned<Path.Partition>>): string {
    if (this.#dependencies.depot.permalink) {
      return this.#dependencies.depot.permalink(dataRoot, path)
    } else {
      throw new Error("Not implemented in the used depot component")
    }
  }

  // MUTATIONS
  // ---------

  /** @group Mutating */
  async copy<From extends Partition, To extends Partition>(
    from: Path.Distinctive<PartitionedNonEmpty<From>>,
    to: Path.File<PartitionedNonEmpty<To>> | Path.Directory<Partitioned<To>>,
    mutationOptions?: MutationOptions
  ): Promise<MutationResult<To>>
  async copy(
    from: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    to: Path.File<PartitionedNonEmpty<Partition>> | Path.Directory<Partitioned<Partition>>,
    mutationOptions: MutationOptions = {}
  ): Promise<MutationResult<Partition> | null> {
    return this.#infusedTransaction(
      t => t.copy(from, to),
      to,
      mutationOptions
    )
  }

  /** @group Mutating */
  cp = this.copy

  /** @group Mutating */
  async createDirectory<P extends Partition>(
    path: Path.Directory<PartitionedNonEmpty<P>>,
    mutationOptions?: MutationOptions
  ): Promise<MutationResult<P> & { path: Path.Directory<PartitionedNonEmpty<Partition>> }>
  async createDirectory(
    path: Path.Directory<PartitionedNonEmpty<Partition>>,
    mutationOptions: MutationOptions = {}
  ): Promise<MutationResult<Partition> & { path: Path.Directory<PartitionedNonEmpty<Partition>> }> {
    let finalPath = path

    const mutationResult = await this.#infusedTransaction(
      async t => {
        const creationResult = await t.createDirectory(path)
        finalPath = creationResult.path
      },
      path,
      mutationOptions
    )

    return {
      ...mutationResult,
      path: finalPath,
    }
  }

  /** @group Mutating */
  async createFile<
    P extends Partition,
    D extends DataType,
    V = unknown,
  >(
    path: Path.File<PartitionedNonEmpty<P>>,
    dataType: DataType,
    data: DataForType<D, V>,
    mutationOptions?: MutationOptions
  ): Promise<MutationResult<P> & { path: Path.File<PartitionedNonEmpty<Partition>> }>
  async createFile<
    D extends DataType,
    V = unknown,
  >(
    path: Path.File<PartitionedNonEmpty<Partition>>,
    dataType: DataType,
    data: DataForType<D, V>,
    mutationOptions: MutationOptions = {}
  ): Promise<MutationResult<Partition> & { path: Path.File<PartitionedNonEmpty<Partition>> }> {
    let finalPath = path

    const mutationResult = await this.#infusedTransaction(
      async t => {
        const creationResult = await t.createFile(path, dataType, data)
        finalPath = creationResult.path
      },
      path,
      mutationOptions
    )

    return {
      ...mutationResult,
      path: finalPath,
    }
  }

  /** @group Mutating */
  async ensureDirectory<P extends Partition>(
    path: Path.Directory<PartitionedNonEmpty<P>>,
    mutationOptions?: MutationOptions
  ): Promise<MutationResult<P>>
  async ensureDirectory(
    path: Path.Directory<PartitionedNonEmpty<Partition>>,
    mutationOptions: MutationOptions = {}
  ): Promise<MutationResult<Partition>> {
    return this.#infusedTransaction(
      t => t.ensureDirectory(path),
      path,
      mutationOptions
    )
  }

  /** @group Mutating */
  mkdir = this.ensureDirectory

  /** @group Mutating */
  async move<From extends Partition, To extends Partition>(
    from: Path.Distinctive<PartitionedNonEmpty<From>>,
    to: Path.File<PartitionedNonEmpty<To>> | Path.Directory<Partitioned<To>>,
    mutationOptions?: MutationOptions
  ): Promise<MutationResult<To>>
  async move(
    from: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    to: Path.File<PartitionedNonEmpty<Partition>> | Path.Directory<Partitioned<Partition>>,
    mutationOptions: MutationOptions = {}
  ): Promise<MutationResult<Partition>> {
    return this.#infusedTransaction(
      t => t.move(from, to),
      to,
      mutationOptions
    )
  }

  /** @group Mutating */
  mv = this.move

  /** @group Mutating */
  async remove(
    path: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    mutationOptions: MutationOptions = {}
  ): Promise<DataRootChange> {
    const transactionResult = await this.transaction(
      t => t.remove(path),
      mutationOptions
    )

    return {
      dataRoot: transactionResult.dataRoot,
      publishingStatus: transactionResult.publishingStatus,
    }
  }

  /** @group Mutating */
  rm = this.remove

  /** @group Mutating */
  async rename<P extends Partition>(
    path: Path.Distinctive<PartitionedNonEmpty<P>>,
    newName: string,
    mutationOptions?: MutationOptions
  ): Promise<MutationResult<P>>
  async rename(
    path: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    newName: string,
    mutationOptions: MutationOptions = {}
  ): Promise<MutationResult<Partition>> {
    return this.#infusedTransaction(
      t => t.rename(path, newName),
      Path.replaceTerminus(path, newName),
      mutationOptions
    )
  }

  /** @group Mutating */
  async write<
    P extends Partition,
    D extends DataType,
    V = unknown,
  >(
    path: Path.File<PartitionedNonEmpty<P>>,
    dataType: DataType,
    data: DataForType<D, V>,
    mutationOptions?: MutationOptions
  ): Promise<MutationResult<P>>
  async write<
    D extends DataType,
    V = unknown,
  >(
    path: Path.File<PartitionedNonEmpty<Partition>>,
    dataType: DataType,
    data: DataForType<D, V>,
    mutationOptions: MutationOptions = {}
  ): Promise<MutationResult<Partition>> {
    return this.#infusedTransaction(
      t => t.write(path, dataType, data),
      path,
      mutationOptions
    )
  }

  // TRANSACTIONS
  // ------------

  /** @group Transacting */
  async transaction(
    handler: (t: TransactionContext<FileSystem>) => Promise<void>,
    mutationOptions: MutationOptions = {}
  ): Promise<TransactionResult> {
    const context = this.#transactionContext()

    // Execute handler
    await handler(context)

    // Commit transaction
    const { changes, privateNodes, proofs, rootTree } = await TransactionContext.commit(context)

    this.#privateNodes = privateNodes
    this.#rootTree = rootTree

    // Determine data root
    const dataRoot = await this.calculateDataRoot()

    // Emit events
    changes.forEach(async change => {
      await this.#eventEmitter.emit("local-change", {
        dataRoot,
        ...change,
      })
    })

    // Publish
    const signal = mutationOptions.skipPublish === true
      ? Promise.resolve(FileSystem.#statusNotPublishing)
      : this.#publish(dataRoot, proofs)

    // Fin
    return {
      changes,
      dataRoot,
      publishingStatus: signal,
    }
  }

  // 🛠️

  /** @group Misc */
  calculateDataRoot(): Promise<CID> {
    return RootTree.store({
      blockStore: this.#blockStore,
      depot: this.#dependencies.depot,
      rootTree: this.#rootTree,
    })
  }

  // ㊙️  ▒▒  MUTATIONS

  async #infusedTransaction(
    handler: (t: TransactionContext<FileSystem>) => Promise<void>,
    path: Path.Distinctive<Partitioned<Public>>,
    mutationOptions?: MutationOptions
  ): Promise<PublicMutationResult>
  async #infusedTransaction(
    handler: (t: TransactionContext<FileSystem>) => Promise<void>,
    path: Path.Distinctive<Partitioned<Private>>,
    mutationOptions?: MutationOptions
  ): Promise<PrivateMutationResult>
  async #infusedTransaction(
    handler: (t: TransactionContext<FileSystem>) => Promise<void>,
    path: Path.Distinctive<Partitioned<Partition>>,
    mutationOptions?: MutationOptions
  ): Promise<MutationResult<Partition>>
  async #infusedTransaction(
    handler: (t: TransactionContext<FileSystem>) => Promise<void>,
    path: Path.Distinctive<Partitioned<Partition>>,
    mutationOptions: MutationOptions = {}
  ): Promise<MutationResult<Partition>> {
    const transactionResult = await this.transaction(handler, mutationOptions)
    const partition = determinePartition(path)

    switch (partition.name) {
      case "public": {
        const node = partition.segments.length === 0
          ? this.#rootTree.publicRoot.asNode()
          : await this.#rootTree.publicRoot.getNode(partition.segments, this.#blockStore)
        if (!node) throw new Error("Failed to find needed public node for infusion")

        const fileOrDir: PublicFile | PublicDirectory = node.isFile() ? node.asFile() : node.asDir()

        const capsuleCID = await fileOrDir.store(this.#blockStore).then(a => CID.decode(a))
        const contentCID = node.isFile() ? CID.decode(node.asFile().contentCid()) : capsuleCID

        return {
          dataRoot: transactionResult.dataRoot,
          publishingStatus: transactionResult.publishingStatus,
          capsuleCID,
          contentCID,
        }
      }

      case "private": {
        const priv = findPrivateNode(partition.path, this.#privateNodes)
        const accessKey = priv.node.isFile()
          ? await priv.node
            .asFile()
            .store(this.#rootTree.privateForest, this.#blockStore, this.#rng)
          : await (
            priv.remainder.length === 0
              ? Promise.resolve(priv.node)
              : priv.node
                .asDir()
                .getNode(priv.remainder, searchLatest(), this.#rootTree.privateForest, this.#blockStore)
          )
            .then(node => {
              if (!node) throw new Error("Failed to find needed private node for infusion")
              return node.store(this.#rootTree.privateForest, this.#blockStore)
            })
            .then(([key]) => key)

        return {
          dataRoot: transactionResult.dataRoot,
          publishingStatus: transactionResult.publishingStatus,
          capsuleKey: accessKey.toBytes(),
        }
      }
    }
  }

  #transactionContext(): TransactionContext<FileSystem> {
    return new TransactionContext(
      this.#blockStore,
      this.#dependencies,
      this.did,
      this.#inventory,
      { ...this.#privateNodes },
      this.#rng,
      { ...this.#rootTree }
    )
  }

  // ㊙️  ▒▒  PUBLISHING

  static #statusNotPublishing: PublishingStatus = {
    persisted: false,
    reason: "DISABLED_BY_OPTIONS",
  }

  #debouncedDataRootUpdate = debounce(
    async (args: [dataRoot: CID, proofs: Ticket[]][]): Promise<PublishingStatus[]> => {
      const [dataRoot, proofs] = args[args.length - 1]

      await this.#dependencies.depot.flush(dataRoot, proofs, this.#inventory)

      let status: PublishingStatus

      if (!this.#updateDataRoot) {
        status = {
          persisted: false,
          reason: "DATA_ROOT_UPDATER_NOT_CONFIGURED",
        }

        return args.map(_ => status)
      }

      const rootUpdate = await this.#updateDataRoot(
        dataRoot,
        proofs
      )

      if (rootUpdate.updated) {
        await this.#eventEmitter.emit("publish", { dataRoot, proofs })
        status = { persisted: true }
      } else {
        status = { persisted: false, reason: rootUpdate.reason }
      }

      return args.map(_ => status)
    },
    (() => this.#settleTimeBeforePublish) as any,
    {
      accumulate: true,
      leading: false,
    }
  )

  /**
   * Updates the user's data root if it can find a UCAN that allows them to do so.
   */
  async #publish(
    dataRoot: CID,
    proofs: Ticket[]
  ): Promise<PublishingStatus> {
    await this.#cidLog.add([dataRoot])
    const debounceResult = await this.#debouncedDataRootUpdate(dataRoot, proofs)

    // The type of `debounceResult` is not correct, issue with `@types/debounce-promise`
    return debounceResult as unknown as PublishingStatus
  }
}
