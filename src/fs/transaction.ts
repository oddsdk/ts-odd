import { AccessKey, BlockStore, PrivateForest, PublicFile, PublicNode } from "wnfs"

import * as Path from "../path/index.js"
import * as Mutations from "./mutations.js"
import * as Queries from "./queries.js"
import * as Unix from "./unix.js"

import { CID } from "../common/cid.js"
import { Inventory } from "../inventory.js"
import { Partition, Partitioned, PartitionedNonEmpty, Private, Public } from "../path/index.js"
import { Ticket } from "../ticket/types.js"
import { addOrIncreaseNameNumber, pathSegmentsWithoutPartition, searchLatest } from "./common.js"
import { dataFromBytes, dataToBytes } from "./data.js"
import { throwNoAccess } from "./errors.js"
import { findPrivateNode, partition as determinePartition } from "./mounts.js"
import { Rng } from "./rng.js"
import { RootTree } from "./rootTree.js"
import {
  AnySupportedDataType,
  DataForType,
  DataType,
  Dependencies,
  DirectoryItem,
  DirectoryItemWithKind,
  MutationType,
} from "./types.js"
import { MountedPrivateNodes, PrivateNodeQueryResult } from "./types/internal.js"

/** @group File System */
export class TransactionContext<FS> {
  #blockStore: BlockStore
  #dependencies: Dependencies<FS>
  #did: string
  #inventory: Inventory
  #privateNodes: MountedPrivateNodes
  #rng: Rng
  #rootTree: RootTree

  #changes: Set<{
    type: MutationType
    path: Path.Distinctive<Partitioned<Partition>>
  }>

  /** @internal */
  constructor(
    blockStore: BlockStore,
    dependencies: Dependencies<FS>,
    did: string,
    inventory: Inventory,
    privateNodes: MountedPrivateNodes,
    rng: Rng,
    rootTree: RootTree
  ) {
    this.#blockStore = blockStore
    this.#dependencies = dependencies
    this.#did = did
    this.#privateNodes = privateNodes
    this.#rng = rng
    this.#rootTree = rootTree
    this.#inventory = inventory

    this.#changes = new Set()
  }

  /** @internal */
  static async commit<FS>(context: TransactionContext<FS>): Promise<{
    changes: { path: Path.Distinctive<Partitioned<Partition>>; type: MutationType }[]
    privateNodes: MountedPrivateNodes
    proofs: Ticket[]
    rootTree: RootTree
  }> {
    const changes = Array.from(context.#changes)

    // Proofs
    const proofs = await changes.reduce(
      async (accPromise: Promise<Ticket[]>, change): Promise<Ticket[]> => {
        const acc = await accPromise
        const proof = await context.#inventory.lookupFileSystemTicket(
          change.path,
          context.#did
        )

        // Throw error if no write access to this path
        if (!proof) {
          throwNoAccess(
            change.path,
            "write"
          )
        }

        return [...acc, proof]
      },
      Promise.resolve([])
    )

    // Private forest
    const newForest = await changes.reduce(
      async (oldForestPromise, change): Promise<PrivateForest> => {
        const oldForest = await oldForestPromise

        if (!Path.isPartition("private", change.path)) {
          return oldForest
        }

        const maybeNode = findPrivateNode(
          change.path as Path.Distinctive<Path.Partitioned<Path.Private>>,
          context.#privateNodes
        )

        if (maybeNode) {
          const [_newAccessKey, newForest] = await maybeNode.node.store(oldForest, context.#blockStore, context.#rng)
          return newForest
        } else {
          return oldForest
        }
      },
      Promise.resolve(
        context.#rootTree.privateForest
      )
    )

    // Unix tree
    const unixTree = await changes.reduce(
      async (oldRootPromise, change) => {
        const oldRoot = await oldRootPromise

        if (!Path.isPartition("public", change.path)) {
          return oldRoot
        }

        const path = Path.removePartition(change.path)

        if (change.type === "removed") {
          return Unix.removeNodeFromTree(
            oldRoot,
            path,
            context.#dependencies.depot
          )
        }

        const contentCID = Path.isFile(change.path) && Path.isPartitionedNonEmpty<Path.Public>(change.path)
          ? await context.contentCID(change.path).then(a => a || undefined)
          : undefined

        return Unix.insertNodeIntoTree(
          oldRoot,
          path,
          context.#dependencies.depot,
          contentCID
        )
      },
      Promise.resolve(
        context.#rootTree.unix
      )
    )

    // Replace forest
    const rootTree = { ...context.#rootTree, privateForest: newForest, unix: unixTree }

    // Fin
    return {
      changes: changes,
      privateNodes: context.#privateNodes,
      proofs: proofs,
      rootTree: rootTree,
    }
  }

  // QUERIES

  /** @group Querying */
  async contentCID(path: Path.File<Partitioned<Public>>): Promise<CID | null> {
    const result = await this.#rootTree.publicRoot.getNode(
      pathSegmentsWithoutPartition(path),
      this.#blockStore
    )

    const maybeNode: PublicNode | null = result || null
    return maybeNode?.isFile()
      ? CID.decode(maybeNode.asFile().contentCid())
      : null
  }

  /** @group Querying */
  async capsuleCID(path: Path.Distinctive<Partitioned<Public>>): Promise<CID | null> {
    const result = await this.#rootTree.publicRoot.getNode(
      pathSegmentsWithoutPartition(path),
      this.#blockStore
    )

    const maybeNode: PublicNode | null = result || null
    return maybeNode
      ? CID.decode(
        maybeNode.isFile()
          ? await maybeNode.asFile().store(this.#blockStore)
          : await maybeNode.asDir().store(this.#blockStore)
      )
      : null
  }

  /** @group Querying */
  async capsuleKey(path: Path.Distinctive<Partitioned<Private>>): Promise<Uint8Array | null> {
    let priv: PrivateNodeQueryResult

    try {
      priv = findPrivateNode(path, this.#privateNodes)
    } catch {
      return null
    }

    return priv.remainder.length === 0 || priv.node.isFile()
      ? priv.node
        .store(this.#rootTree.privateForest, this.#blockStore, this.#rng)
        .then(([accessKey]: [AccessKey, PrivateForest]) => accessKey.toBytes())
      : priv.node.asDir()
        .getNode(
          priv.remainder,
          searchLatest(),
          this.#rootTree.privateForest,
          this.#blockStore
        )
        .then(result => {
          return result
            ? result
              .store(this.#rootTree.privateForest, this.#blockStore, this.#rng)
              .then(([accessKey]: [AccessKey, PrivateForest]) => accessKey.toBytes())
            : null
        })
  }

  /** @group Querying */
  async exists(path: Path.Distinctive<Partitioned<Partition>>): Promise<boolean> {
    return this.#query(
      path,
      {
        public: Queries.publicExists(),
        private: Queries.privateExists(),
      }
    )
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
    listOptions?: { withItemKind: boolean }
  ): Promise<DirectoryItem[] | DirectoryItemWithKind[]>
  async listDirectory(
    path: Path.Directory<Partitioned<Partition>>,
    listOptions: { withItemKind: boolean } = { withItemKind: false }
  ): Promise<DirectoryItem[] | DirectoryItemWithKind[]> {
    if (listOptions.withItemKind) {
      return this.#query(
        path,
        {
          public: Queries.publicListDirectoryWithKind(),
          private: Queries.privateListDirectoryWithKind(),
        }
      )
    }

    return this.#query(
      path,
      {
        public: Queries.publicListDirectory(),
        private: Queries.privateListDirectory(),
      }
    )
  }

  /** @group Querying */
  ls = this.listDirectory

  /** @group Querying */
  async read<D extends DataType, V = unknown>(
    arg: Path.File<PartitionedNonEmpty<Partition>> | { contentCID: CID } | { capsuleCID: CID } | {
      capsuleKey: Uint8Array
    },
    dataType: DataType,
    options?: { offset: number; length: number }
  ): Promise<DataForType<D, V>>
  async read<V = unknown>(
    arg: Path.File<PartitionedNonEmpty<Partition>> | { contentCID: CID } | { capsuleCID: CID } | {
      capsuleKey: Uint8Array
    },
    dataType: DataType,
    options?: { offset: number; length: number }
  ): Promise<AnySupportedDataType<V>> {
    let bytes

    if ("contentCID" in arg) {
      // Public content from content CID
      bytes = await Queries.publicReadFromCID(
        arg.contentCID,
        options
      )(
        this.#publicContext()
      )
    } else if ("capsuleCID" in arg) {
      // Public content from capsule CID
      const publicFile: PublicFile = await PublicFile.load(arg.capsuleCID.bytes, this.#blockStore)

      return this.read<DataType, V>(
        { contentCID: CID.decode(publicFile.contentCid()) },
        dataType,
        options
      )
    } else if ("capsuleKey" in arg) {
      // Private content from capsule key
      bytes = await Queries.privateReadFromAccessKey(
        AccessKey.fromBytes(arg.capsuleKey),
        options
      )(
        this.#privateContext()
      )
    } else if ("file" in arg || "directory" in arg) {
      // Public or private from path
      bytes = await this.#query(
        arg,
        {
          public: Queries.publicRead(options),
          private: Queries.privateRead(options),
        }
      )
    } else {
      // ⚠️
      throw new Error("Invalid argument")
    }

    return dataFromBytes(dataType, bytes)
  }

  // MUTATIONS

  /** @group Mutating */
  async copy(
    fromParam: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    toParam: Path.File<PartitionedNonEmpty<Partition>> | Path.Directory<Partitioned<Partition>>
  ): Promise<void> {
    const from = fromParam
    let to = toParam

    if (Path.isDirectory(fromParam) && Path.isFile(toParam)) throw new Error("Cannot copy a directory to a file")
    if (Path.isFile(fromParam) && Path.isDirectory(toParam)) to = Path.combine(toParam, Path.file(Path.terminus(from)))

    if (Path.isFile(from) && Path.isFile(to)) {
      return this.#manualCopyFile(from, to)
    } else if (Path.isDirectory(from) && Path.isDirectory(to)) {
      return this.#manualCopyDirectory(from, to)
    }

    // NOOP
    throw new Error(`Copy no-op, from '${Path.toPosix(from)}' to '${Path.toPosix(to)}'`)
  }

  /** @group Mutating */
  cp = this.copy

  /** @group Mutating */
  async createDirectory(
    path: Path.Directory<PartitionedNonEmpty<Partition>>
  ): Promise<{ path: Path.Directory<PartitionedNonEmpty<Partition>> }> {
    if (await this.exists(path)) {
      const newPath = addOrIncreaseNameNumber(path)
      return this.createDirectory(newPath)
    } else {
      await this.ensureDirectory(path)
      return { path: path }
    }
  }

  /** @group Mutating */
  async createFile<D extends DataType, V = unknown>(
    path: Path.File<PartitionedNonEmpty<Partition>>,
    dataType: DataType,
    data: DataForType<D, V>
  ): Promise<{ path: Path.File<PartitionedNonEmpty<Partition>> }> {
    if (await this.exists(path)) {
      const newPath = addOrIncreaseNameNumber(path)
      return this.createFile(newPath, dataType, data)
    } else {
      await this.write(path, dataType, data)
      return { path: path }
    }
  }

  /** @group Mutating */
  async ensureDirectory(
    path: Path.Directory<PartitionedNonEmpty<Partition>>
  ): Promise<void> {
    const partition = determinePartition(path)

    switch (partition.name) {
      case "public":
        return this.#publicMutation(
          partition.path,
          Mutations.publicCreateDirectory(),
          Mutations.TYPES.ADDED_OR_UPDATED
        )

      case "private":
        return this.#privateMutation(
          partition.path,
          Mutations.privateCreateDirectory(),
          Mutations.TYPES.ADDED_OR_UPDATED
        )
    }
  }

  mkdir = this.ensureDirectory

  async move(
    fromParam: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    toParam: Path.File<PartitionedNonEmpty<Partition>> | Path.Directory<Partitioned<Partition>>
  ): Promise<void> {
    const from = fromParam
    let to = toParam

    if (Path.isDirectory(fromParam) && Path.isFile(toParam)) throw new Error("Cannot move a directory to a file")
    if (Path.isFile(fromParam) && Path.isDirectory(toParam)) to = Path.combine(toParam, Path.file(Path.terminus(from)))

    return this.#manualMove(from, to)
  }

  /** @group Mutating */
  mv = this.move

  /** @group Mutating */
  async remove(
    path: Path.Distinctive<PartitionedNonEmpty<Partition>>
  ): Promise<void> {
    const partition = determinePartition(path)

    switch (partition.name) {
      case "public":
        return this.#publicMutation(
          partition.path,
          Mutations.publicRemove(),
          Mutations.TYPES.REMOVED
        )

      case "private":
        return this.#privateMutation(
          partition.path,
          Mutations.privateRemove(),
          Mutations.TYPES.REMOVED
        )
    }
  }

  /** @group Mutating */
  rm = this.remove

  /** @group Mutating */
  async rename(
    path: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    newName: string
  ): Promise<void> {
    const fromPath = path
    const toPath = Path.replaceTerminus(fromPath, newName)

    return this.move(fromPath, toPath)
  }

  /** @group Mutating */
  async write<D extends DataType, V = unknown>(
    path: Path.File<PartitionedNonEmpty<Partition>>,
    dataType: DataType,
    data: DataForType<D, V>
  ): Promise<void> {
    const bytes = dataToBytes<V>(dataType, data)
    const partition = determinePartition(path)

    switch (partition.name) {
      case "public":
        return this.#publicMutation(
          partition.path,
          Mutations.publicWrite(bytes),
          Mutations.TYPES.ADDED_OR_UPDATED
        )

      case "private":
        return this.#privateMutation(
          partition.path,
          Mutations.privateWrite(bytes),
          Mutations.TYPES.ADDED_OR_UPDATED
        )
    }
  }

  // ㊙️  ▒▒  QUERIES

  #query<T>(
    path: Path.Distinctive<Partitioned<Partition>>,
    queryFunctions: {
      public: Queries.Public<T>
      private: Queries.Private<T>
    }
  ): Promise<T> {
    const partition = determinePartition(path)

    switch (partition.name) {
      case "public":
        return Queries.publicQuery(
          partition.path,
          queryFunctions.public,
          this.#publicContext()
        )

      case "private":
        return Queries.privateQuery(
          partition.path,
          queryFunctions.private,
          this.#privateContext()
        )
    }
  }

  // ㊙️  ▒▒  MUTATIONS

  async #manualCopyFile(
    from: Path.File<PartitionedNonEmpty<Partition>>,
    to: Path.File<PartitionedNonEmpty<Partition>>
  ): Promise<void> {
    return this.write(to, "bytes", await this.read(from, "bytes"))
  }

  async #manualCopyDirectory(
    from: Path.Directory<PartitionedNonEmpty<Partition>>,
    to: Path.Directory<Partitioned<Partition>>
  ): Promise<void> {
    if (Path.isPartitionedNonEmpty(to)) await this.ensureDirectory(to)

    // Copies everything under `fromDir/` to `toDir/`
    // eg. `public/docs/fromDir/a/b/c.txt` -> `private/docs/toDir/a/b/c.txt`
    const listing = await this.listDirectory(from, { withItemKind: true })
    if (listing.length === 0) return

    return listing.reduce(async (
      acc: Promise<void>,
      item: DirectoryItemWithKind
    ): Promise<void> => {
      await acc

      if (item.kind === "directory") {
        return this.#manualCopyDirectory(
          Path.combine(from, Path.directory(item.name)),
          Path.combine(to, Path.directory(item.name))
        )
      }

      return this.#manualCopyFile(
        Path.combine(from, Path.file(item.name)),
        Path.combine(to, Path.file(item.name))
      )
    }, Promise.resolve())
  }

  async #manualMove(
    from: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    to: Path.File<PartitionedNonEmpty<Partition>> | Path.Directory<Partitioned<Partition>>
  ): Promise<void> {
    await this.copy(from, to)
    return this.remove(from)
  }

  async #publicMutation(
    path: Path.Distinctive<Partitioned<Public>>,
    mut: Mutations.Public,
    mutType: MutationType
  ): Promise<void> {
    const result = await mut({
      blockStore: this.#blockStore,
      dependencies: this.#dependencies,
      pathSegments: Path.unwrap(Path.removePartition(path)),
      rootTree: this.#rootTree,
    })

    // Replace public root
    this.#rootTree = { ...this.#rootTree, publicRoot: result.rootDir }

    // Mark node as changed
    this.#changes.add({
      type: mutType,
      path: path,
    })
  }

  async #privateMutation(
    path: Path.Distinctive<Partitioned<Private>>,
    mut: Mutations.Private,
    mutType: MutationType
  ): Promise<void> {
    const priv = findPrivateNode(path, this.#privateNodes)

    // Perform mutation
    const result = await mut({
      ...priv,
      blockStore: this.#blockStore,
      privateNodes: this.#privateNodes,
      rng: this.#rng,
      rootTree: this.#rootTree,
    })

    // Mark node as changed
    this.#changes.add({
      type: mutType,
      path: path,
    })

    // Replace forest
    this.#rootTree = { ...this.#rootTree, privateForest: result.forest }

    // Replace private node
    const nodePosix = Path.toPosix(priv.path, { absolute: true })
    const node = result.rootDir.asNode()

    this.#privateNodes[nodePosix] = {
      node,
      path: priv.path,
    }
  }

  // ㊙️

  #publicContext(): Queries.PublicContext<FS> {
    return {
      blockStore: this.#blockStore,
      dependencies: this.#dependencies,
      rootTree: this.#rootTree,
    }
  }

  #privateContext(): Queries.PrivateContext {
    return {
      blockStore: this.#blockStore,
      privateNodes: this.#privateNodes,
      rng: this.#rng,
      rootTree: this.#rootTree,
    }
  }
}
