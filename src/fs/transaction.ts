import { BlockStore, PrivateForest, PrivateRef, PublicFile, PublicNode } from "wnfs"

import * as Mutations from "./mutations.js"
import * as Path from "../path/index.js"
import * as Queries from "./queries.js"

import { AnySupportedDataType, DataForType, DataType, Dependencies, DirectoryItem, DirectoryItemWithKind, PrivateReference } from "./types.js"
import { CID } from "../common/cid.js"
import { MountedPrivateNodes, PrivateNodeQueryResult } from "./types/internal.js"
import { Partition, Partitioned, PartitionedNonEmpty, Private, Public } from "../path/index.js"
import { RootTree } from "./rootTree.js"
import { Rng } from "./rng.js"
import { Ucan } from "../ucan/types.js"
import { agent } from "../did/local.js"
import { dataFromBytes, dataToBytes } from "./data.js"
import { findPrivateNode, partition as determinePartition } from "./mounts.js"
import { addOrIncreaseNameNumber, pathSegmentsWithoutPartition, privateReferenceFromWnfsRef, searchLatest, wnfsRefFromPrivateReference } from "./common.js"
import { throwNoAccess } from "./errors.js"
import { hasProp } from "../common/type-checks.js"


export class TransactionContext {

  private changedPaths: Set<Path.Distinctive<Partitioned<Partition>>>

  constructor(
    private blockStore: BlockStore,
    private dependencies: Dependencies,
    private privateNodes: MountedPrivateNodes,
    private rng: Rng,
    private rootTree: RootTree
  ) {
    this.changedPaths = new Set()
  }


  static async commit(context: TransactionContext): Promise<{
    changedPaths: Array<Path.Distinctive<Partitioned<Partition>>>,
    privateNodes: MountedPrivateNodes,
    proofs: Ucan[],
    rootTree: RootTree,
  }> {
    const changedPaths = Array.from(context.changedPaths)
    const audience = await agent(context.dependencies.crypto)

    // Proofs
    const proofs = await changedPaths.reduce(
      async (accPromise: Promise<Ucan[]>, changedPath: Path.Distinctive<Partitioned<Partition>>): Promise<Ucan[]> => {
        const acc = await accPromise

        const proof = await context.dependencies.reference.repositories.ucans.lookupFileSystemUcan(
          audience,
          changedPath
        )

        // Throw error if no write access to this path
        if (!proof) throwNoAccess(
          changedPath,
          "write"
        )

        return acc
      },
      Promise.resolve([])
    )

    // Private forest
    const newForest = await changedPaths.reduce(
      async (oldForestPromise, changedPath): Promise<PrivateForest> => {
        const oldForest = await oldForestPromise

        if (!Path.isPartition("private", changedPath)) {
          return oldForest
        }

        const nodePath = Path.removePartition(changedPath)
        const posixPath = Path.toPosix(nodePath, { absolute: true })
        const maybeNode = context.privateNodes[ posixPath ]

        if (maybeNode) {
          const [ _, newForest ] = await maybeNode.node.store(oldForest, context.blockStore, context.rng)
          return newForest
        } else {
          return oldForest
        }
      },
      Promise.resolve(
        context.rootTree.privateForest
      )
    )

    // Replace forest
    const rootTree = { ...context.rootTree, privateForest: newForest }

    // Fin
    return {
      changedPaths: changedPaths,
      privateNodes: context.privateNodes,
      proofs: proofs,
      rootTree: rootTree,
    }
  }



  // QUERIES


  async contentCID(path: Path.File<Partitioned<Public>>): Promise<CID | null> {
    const result = await this.rootTree.publicRoot.getNode(
      pathSegmentsWithoutPartition(path),
      this.blockStore
    )

    const maybeNode: PublicNode | null = result || null
    return maybeNode?.isFile()
      ? CID.decode(maybeNode.asFile().contentCid())
      : null
  }


  async capsuleCID(path: Path.Distinctive<Partitioned<Public>>): Promise<CID | null> {
    const result = await this.rootTree.publicRoot.getNode(
      pathSegmentsWithoutPartition(path),
      this.blockStore
    )

    const maybeNode: PublicNode | null = result || null
    return maybeNode
      ? CID.decode(maybeNode.isFile()
        ? await maybeNode.asFile().store(this.blockStore)
        : await maybeNode.asDir().store(this.blockStore)
      )
      : null
  }


  async capsuleRef(path: Path.Distinctive<Partitioned<Private>>): Promise<PrivateReference | null> {
    let priv: PrivateNodeQueryResult

    try {
      priv = findPrivateNode(path, this.privateNodes)
    } catch {
      return null
    }

    return priv.remainder.length === 0 || priv.node.isFile()
      ? priv.node
        .store(this.rootTree.privateForest, this.blockStore, this.rng)
        .then(([ ref ]: [ PrivateRef, PrivateForest ]) => privateReferenceFromWnfsRef(ref))
      : priv.node.asDir()
        .getNode(
          priv.remainder,
          searchLatest(),
          this.rootTree.privateForest,
          this.blockStore
        )
        .then(({ result }) => {
          return result
            ? result
              .store(this.rootTree.privateForest, this.blockStore, this.rng)
              .then(([ ref ]: [ PrivateRef, PrivateForest ]) => privateReferenceFromWnfsRef(ref))
            : null
        })

  }


  async exists(path: Path.Distinctive<Partitioned<Partition>>): Promise<boolean> {
    return this.query(
      path,
      {
        public: Queries.publicExists(),
        private: Queries.privateExists()
      }
    )
  }


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
    if (listOptions.withItemKind) return this.query(
      path,
      {
        public: Queries.publicListDirectoryWithKind(),
        private: Queries.privateListDirectoryWithKind()
      }
    )

    return this.query(
      path,
      {
        public: Queries.publicListDirectory(),
        private: Queries.privateListDirectory()
      }
    )
  }


  ls = this.listDirectory


  async read<D extends DataType, V = unknown>(
    arg: Path.File<PartitionedNonEmpty<Partition>> | { contentCID: CID } | { capsuleCID: CID } | { capsuleRef: PrivateReference },
    dataType: DataType,
    options?: { offset: number, length: number }
  ): Promise<DataForType<D, V>>
  async read<V = unknown>(
    arg: Path.File<PartitionedNonEmpty<Partition>> | { contentCID: CID } | { capsuleCID: CID } | { capsuleRef: PrivateReference },
    dataType: DataType,
    options?: { offset: number, length: number }
  ): Promise<AnySupportedDataType<V>> {
    let bytes

    if (hasProp(arg, "contentCID")) {
      // Public content from content CID
      bytes = await Queries.publicReadFromCID(
        arg.contentCID,
        options
      )(
        this.publicContext()
      )

    } else if (hasProp(arg, "capsuleCID")) {
      // Public content from capsule CID
      const publicFile: PublicFile = await PublicFile.load(arg.capsuleCID.bytes, this.blockStore)

      return this.read<DataType, V>(
        { contentCID: CID.decode(publicFile.contentCid()) },
        dataType,
        options
      )

    } else if (hasProp(arg, "capsuleRef")) {
      // Private content from capsule reference
      bytes = await Queries.privateReadFromReference(
        wnfsRefFromPrivateReference(arg.capsuleRef),
        options
      )(
        this.privateContext()
      )

    } else if (hasProp(arg, "file") || hasProp(arg, "directory")) {
      // Public or private from path
      bytes = await this.query(
        arg,
        {
          public: Queries.publicRead(options),
          private: Queries.privateRead(options)
        }
      )

    } else {
      // ⚠️
      throw new Error("Invalid argument")

    }

    return dataFromBytes(dataType, bytes)
  }



  // MUTATIONS


  async copy(
    fromParam: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    toParam: Path.File<PartitionedNonEmpty<Partition>> | Path.Directory<Partitioned<Partition>>
  ): Promise<void> {
    let from = fromParam
    let to = toParam

    if (Path.isDirectory(fromParam) && Path.isFile(toParam)) throw new Error("Cannot copy a directory to a file")
    if (Path.isFile(fromParam) && Path.isDirectory(toParam)) to = Path.combine(toParam, Path.file(Path.terminus(from)))

    if (Path.isFile(from) && Path.isFile(to)) {
      return this.manualCopyFile(from, to)
    } else if (Path.isDirectory(from) && Path.isDirectory(to)) {
      return this.manualCopyDirectory(from, to)
    }

    // NOOP
    throw new Error(`Copy no-op, from '${Path.toPosix(from)}' to '${Path.toPosix(to)}'`)
  }


  cp = this.copy


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


  async ensureDirectory(
    path: Path.Directory<PartitionedNonEmpty<Partition>>
  ): Promise<void> {
    const partition = determinePartition(path)

    switch (partition.name) {
      case "public": return this.publicMutation(
        partition.path,
        Mutations.publicCreateDirectory()
      )

      case "private": return this.privateMutation(
        partition.path,
        Mutations.privateCreateDirectory()
      )
    }
  }


  mkdir = this.ensureDirectory


  async move(
    fromParam: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    toParam: Path.File<PartitionedNonEmpty<Partition>> | Path.Directory<Partitioned<Partition>>
  ): Promise<void> {
    let from = fromParam
    let to = toParam

    if (Path.isDirectory(fromParam) && Path.isFile(toParam)) throw new Error("Cannot move a directory to a file")
    if (Path.isFile(fromParam) && Path.isDirectory(toParam)) to = Path.combine(toParam, Path.file(Path.terminus(from)))

    return this.manualMove(from, to)
  }


  mv = this.move


  async remove(
    path: Path.Distinctive<PartitionedNonEmpty<Partition>>
  ): Promise<void> {
    const partition = determinePartition(path)

    switch (partition.name) {
      case "public": return this.publicMutation(
        partition.path,
        Mutations.publicRemove()
      )

      case "private": return this.privateMutation(
        partition.path,
        Mutations.privateRemove()
      )
    }
  }


  rm = this.remove


  async rename(
    path: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    newName: string
  ): Promise<void> {
    const fromPath = path
    const toPath = Path.replaceTerminus(fromPath, newName)

    return this.move(fromPath, toPath)
  }


  async write<D extends DataType, V = unknown>(
    path: Path.File<PartitionedNonEmpty<Partition>>,
    dataType: DataType,
    data: DataForType<D, V>,
  ): Promise<void> {
    const bytes = dataToBytes<V>(dataType, data)
    const partition = determinePartition(path)

    switch (partition.name) {
      case "public": return this.publicMutation(
        partition.path,
        Mutations.publicWrite(bytes)
      )

      case "private": return this.privateMutation(
        partition.path,
        Mutations.privateWrite(bytes)
      )
    }
  }



  // ㊙️  ▒▒  QUERIES


  query<T>(
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
          this.publicContext()
        )

      case "private":
        return Queries.privateQuery(
          partition.path,
          queryFunctions.private,
          this.privateContext()
        )
    }
  }



  // ㊙️  ▒▒  MUTATIONS


  private async manualCopyFile(
    from: Path.File<PartitionedNonEmpty<Partition>>,
    to: Path.File<PartitionedNonEmpty<Partition>>
  ): Promise<void> {
    return this.write(to, "bytes", await this.read(from, "bytes"))
  }


  private async manualCopyDirectory(
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
        return this.manualCopyDirectory(
          Path.combine(from, Path.directory(item.name)),
          Path.combine(to, Path.directory(item.name))
        )
      }

      return this.manualCopyFile(
        Path.combine(from, Path.file(item.name)),
        Path.combine(to, Path.file(item.name))
      )
    }, Promise.resolve())
  }


  private async manualMove(
    from: Path.Distinctive<PartitionedNonEmpty<Partition>>,
    to: Path.File<PartitionedNonEmpty<Partition>> | Path.Directory<Partitioned<Partition>>
  ): Promise<void> {
    await this.copy(from, to)
    return this.remove(from)
  }


  private async publicMutation(
    path: Path.Distinctive<Partitioned<Public>>,
    mut: Mutations.Public
  ): Promise<void> {
    const result = await mut({
      blockStore: this.blockStore,
      dependencies: this.dependencies,
      pathSegments: Path.unwrap(Path.removePartition(path)),
      rootTree: this.rootTree
    })

    // Replace public root
    this.rootTree = { ...this.rootTree, publicRoot: result.rootDir }
  }


  private async privateMutation(
    path: Path.Distinctive<Partitioned<Private>>,
    mut: Mutations.Private
  ): Promise<void> {
    const priv = findPrivateNode(path, this.privateNodes)

    // Perform mutation
    const result = await mut({
      ...priv,
      blockStore: this.blockStore,
      privateNodes: this.privateNodes,
      rng: this.rng,
      rootTree: this.rootTree,
    })

    // Mark node as changed
    this.changedPaths.add(
      Path.withPartition("private", priv.path)
    )

    // Replace forest
    this.rootTree = { ...this.rootTree, privateForest: result.forest }

    // Replace private node
    const nodePosix = Path.toPosix(priv.path, { absolute: true })

    this.privateNodes[ nodePosix ] = {
      node: result.rootDir.asNode(),
      path: priv.path
    }
  }



  // ㊙️


  publicContext(): Queries.PublicContext {
    return {
      blockStore: this.blockStore,
      dependencies: this.dependencies,
      rootTree: this.rootTree,
    }
  }

  privateContext(): Queries.PrivateContext {
    return {
      blockStore: this.blockStore,
      privateNodes: this.privateNodes,
      rng: this.rng,
      rootTree: this.rootTree,
    }
  }

}