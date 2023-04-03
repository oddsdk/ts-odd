import * as cbor from "@ipld/dag-cbor"
import * as uint8arrays from "uint8arrays"
import { CID } from "multiformats/cid"
import { throttle } from "throttle-debounce"

import * as Crypto from "../components/crypto/implementation.js"
import * as Depot from "../components/depot/implementation.js"
import * as Manners from "../components/manners/implementation.js"
import * as Reference from "../components/reference/implementation.js"
import * as Storage from "../components/storage/implementation.js"

import * as DID from "../did/index.js"
import * as Events from "../events.js"
import * as FsTypeChecks from "./types/check.js"
import * as Path from "../path/index.js"
import * as TypeChecks from "../common/type-checks.js"
import * as Ucan from "../ucan/index.js"
import * as Versions from "./versions.js"

import { RootBranch, Partitioned, PartitionedNonEmpty, Partition, DistinctivePath } from "../path/index.js"
import { EventEmitter } from "../events.js"
import { Permissions } from "../permissions.js"
import { SymmAlg } from "../components/crypto/implementation.js"
import { decodeCID } from "../common/index.js"

// FILESYSTEM IMPORTS

import { DEFAULT_AES_ALG } from "./protocol/basic.js"
import { API, AssociatedIdentity, Links, PuttableUnixTree, UnixTree } from "./types.js"
import { NoPermissionError } from "./errors.js"
import { PublishHook, Tree, File, SharedBy, ShareDetails, SoftLink } from "./types.js"
import BareTree from "./bare/tree.js"
import MMPT from "./protocol/private/mmpt.js"
import RootTree from "./root/tree.js"
import PublicTree from "./v1/PublicTree.js"
import PrivateFile from "./v1/PrivateFile.js"
import PrivateTree from "./v1/PrivateTree.js"

import * as PrivateTypeChecks from "./protocol/private/types/check.js"
import * as Protocol from "./protocol/index.js"
import * as ShareKey from "./protocol/shared/key.js"
import * as Sharing from "./share.js"


// TYPES


export type Dependencies = {
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation
  storage: Storage.Implementation
}

export type FileSystemOptions = {
  account: AssociatedIdentity
  dependencies: Dependencies
  eventEmitter: EventEmitter<Events.FileSystem>
  localOnly?: boolean
  permissions?: Permissions
}

export type MutationOptions = {
  publish?: boolean
}

export type NewFileSystemOptions = FileSystemOptions & {
  rootKey?: Uint8Array
  version?: string
}

type ConstructorParams = {
  account: AssociatedIdentity
  dependencies: Dependencies
  eventEmitter: EventEmitter<Events.FileSystem>
  localOnly?: boolean
  root: RootTree
}



// CLASS


export class FileSystem implements API {

  account: AssociatedIdentity
  dependencies: Dependencies
  eventEmitter: EventEmitter<Events.FileSystem>

  root: RootTree
  readonly localOnly: boolean

  proofs: { [ _: string ]: Ucan.Ucan }
  publishHooks: Array<PublishHook>

  _publishWhenOnline: Array<[ CID, Ucan.Ucan ]>
  _publishing: false | [ CID, true ]


  constructor({ account, dependencies, eventEmitter, root, localOnly }: ConstructorParams) {
    this.account = account
    this.dependencies = dependencies
    this.eventEmitter = eventEmitter

    this.localOnly = localOnly || false
    this.proofs = {}
    this.publishHooks = []
    this.root = root

    this._publishWhenOnline = []
    this._publishing = false

    this._whenOnline = this._whenOnline.bind(this)
    this._beforeLeaving = this._beforeLeaving.bind(this)

    // Add the root CID of the file system to the CID log
    // (reverse list, newest cid first)
    const logCid = async (cid: CID) => {
      await this.dependencies.reference.repositories.cidLog.add(cid)
      this.dependencies.manners.log("📓 Adding to the CID ledger:", cid.toString())
    }

    // Update the user's data root when making changes
    const updateDataRootWhenOnline = throttle(3000, false, (cid, proof) => {
      if (globalThis.navigator.onLine) {
        this._publishing = [ cid, true ]
        return this.dependencies.reference.dataRoot.update(cid, proof).then(() => {
          if (this._publishing && this._publishing[ 0 ] === cid) {
            eventEmitter.emit("fileSystem:publish", { root: cid })
            this._publishing = false
          }
        })
      }

      this._publishWhenOnline.push([ cid, proof ])
    }, false)

    this.publishHooks.push(logCid)
    this.publishHooks.push(updateDataRootWhenOnline)

    if (!this.localOnly) {
      // Publish when coming back online
      globalThis.addEventListener("online", this._whenOnline)

      // Show an alert when leaving the page while updating the data root
      globalThis.addEventListener("beforeunload", this._beforeLeaving)
    }
  }


  // INITIALISATION
  // --------------

  /**
   * Creates a file system with an empty public tree & an empty private tree at the root.
   */
  static async empty(opts: NewFileSystemOptions): Promise<FileSystem> {
    const { account, dependencies, eventEmitter, localOnly } = opts
    const rootKey: Uint8Array = opts.rootKey || await (
      dependencies
        .crypto.aes.genKey(DEFAULT_AES_ALG)
        .then(dependencies.crypto.aes.exportKey)
    )

    // Create a file system based on wnfs-wasm when this option is set:
    const wnfsWasm = opts.version === Versions.toString(Versions.wnfsWasm)
    const root = await RootTree.empty({ accountDID: account.rootDID, dependencies, rootKey, wnfsWasm })

    return new FileSystem({
      account,
      dependencies,
      eventEmitter,
      root,
      localOnly
    })
  }

  /**
   * Loads an existing file system from a CID.
   */
  static async fromCID(cid: CID, opts: FileSystemOptions): Promise<FileSystem> {
    const { account, dependencies, eventEmitter, permissions, localOnly } = opts
    const root = await RootTree.fromCID({ accountDID: account.rootDID, dependencies, cid, permissions })

    return new FileSystem({
      account,
      dependencies,
      eventEmitter,
      root,
      localOnly
    })
  }


  // DEACTIVATE
  // ----------

  /**
   * Deactivate a file system.
   *
   * Use this when a user signs out.
   * The only function of this is to stop listing to online/offline events.
   */
  deactivate(): void {
    if (this.localOnly) return
    globalThis.removeEventListener("online", this._whenOnline)
    globalThis.removeEventListener("beforeunload", this._beforeLeaving)
  }


  // POSIX INTERFACE (DIRECTORIES)
  // -----------------------------

  async ls(path: Path.Directory<Partitioned<Partition>>): Promise<Links> {
    if (Path.isFile(path)) throw new Error("`ls` only accepts directory paths")
    return this.runOnNode(path, {
      public: async (root, relPath) => {
        return root.ls(relPath)
      },
      private: async (node, relPath) => {
        if (FsTypeChecks.isFile(node)) {
          throw new Error("Tried to `ls` a file")
        } else {
          return node.ls(relPath)
        }
      }
    })
  }

  async mkdir(path: Path.Directory<PartitionedNonEmpty<Partition>>, options: MutationOptions = {}): Promise<this> {
    if (Path.isFile(path)) throw new Error("`mkdir` only accepts directory paths")

    await this.runMutationOnNode(path, {
      public: async (root: BareTree, relPath) => {
        await root.mkdir(relPath)
      },
      private: async (node, relPath) => {
        if (FsTypeChecks.isFile(node)) {
          throw new Error("Tried to `mkdir` a file")
        } else {
          await node.mkdir(relPath)
        }
      }
    })
    if (options.publish) {
      await this.publish()
    }
    return this
  }


  // POSIX INTERFACE (FILES)
  // -----------------------

  async write(
    path: Path.Distinctive<Partitioned<Partition>>,
    content: Uint8Array | SoftLink | SoftLink[] | Record<string, SoftLink>,
    options: MutationOptions = {}
  ): Promise<this> {
    const contentIsSoftLinks = FsTypeChecks.isSoftLink(content)
      || FsTypeChecks.isSoftLinkDictionary(content)
      || FsTypeChecks.isSoftLinkList(content)

    if (contentIsSoftLinks) {
      if (Path.isFile(path)) {
        throw new Error("Can't add soft links to a file")
      }

      await this.runMutationOnNode(path, {
        public: async (root, relPath) => {
          const links = Array.isArray(content)
            ? content
            : TypeChecks.isObject(content)
              ? Object.values(content) as Array<SoftLink>
              : [ content ] as Array<SoftLink>

          await this.runOnChildTree(root as Tree, relPath, async tree => {
            links.forEach((link: SoftLink) => {
              if (PrivateTree.instanceOf(tree) || PublicTree.instanceOf(tree)) tree.assignLink({
                name: link.name,
                link: link,
                skeleton: link
              })
            })
            return tree
          })
        },
        private: async (node, relPath) => {
          const links = Array.isArray(content)
            ? content
            : TypeChecks.isObject(content)
              ? Object.values(content) as Array<SoftLink>
              : [ content ] as Array<SoftLink>

          await this.runOnChildTree(node as Tree, relPath, async tree => {
            links.forEach((link: SoftLink) => {
              if (PrivateTree.instanceOf(tree) || PublicTree.instanceOf(tree)) tree.assignLink({
                name: link.name,
                link: link,
                skeleton: link
              })
            })

            return tree
          })
        }
      })
    } else {
      if (Path.isDirectory(path)) {
        throw new Error("`add` only accepts file paths when working with regular files")
      }

      await this.runMutationOnNode(path, {
        public: async (root, relPath) => {
          await root.add(relPath, content)
        },
        private: async (node, relPath) => {
          const destinationIsFile = FsTypeChecks.isFile(node)

          if (destinationIsFile) {
            await node.updateContent(content)

          } else {
            await node.add(relPath, content)
          }
        }
      })
    }

    if (options.publish) {
      await this.publish()
    }
    return this
  }

  async read(path: Path.File<PartitionedNonEmpty<Partition>>): Promise<Uint8Array> {
    if (Path.isDirectory(path)) throw new Error("`cat` only accepts file paths")
    return this.runOnNode(path, {
      public: async (root, relPath) => {
        return await root.cat(relPath)
      },
      private: async (node, relPath) => {
        return FsTypeChecks.isFile(node)
          ? node.content
          : await node.cat(relPath)
      }
    })
  }


  // POSIX INTERFACE (GENERAL)
  // -------------------------

  async exists(path: Path.Distinctive<PartitionedNonEmpty<Partition>>): Promise<boolean> {
    return this.runOnNode(path, {
      public: async (root, relPath) => {
        return await root.exists(relPath)
      },
      private: async (node, relPath) => {
        // node is a file, then we tried to check the existance of itself
        return FsTypeChecks.isFile(node) || await node.exists(relPath)
      }
    })
  }

  async get(path: Path.Distinctive<Partitioned<Partition>>): Promise<PuttableUnixTree | File | null> {
    return this.runOnNode(path, {
      public: async (root, relPath) => {
        return await root.get(relPath)
      },
      private: async (node, relPath) => {
        return FsTypeChecks.isFile(node)
          ? node // tried to get itself
          : await node.get(relPath)
      }
    })
  }

  // This is only implemented on the same tree for now and will error otherwise
  async mv(from: Path.Distinctive<PartitionedNonEmpty<Partition>>, to: Path.Distinctive<PartitionedNonEmpty<Partition>>): Promise<this> {
    const sameTree = Path.isSamePartition(from, to)

    if (!Path.isSameKind(from, to)) {
      const kindFrom = Path.kind(from)
      const kindTo = Path.kind(to)
      throw new Error(`Can't move to a different kind of path, from is a ${kindFrom} and to is a ${kindTo}`)
    }

    if (!sameTree) {
      throw new Error("`mv` is only supported on the same tree for now")
    }

    if (await this.exists(to)) {
      throw new Error("Destination already exists")
    }

    await this.runMutationOnNode(from, {
      public: async (root, relPath) => {
        const [ _, ...nextPath ] = Path.unwrap(to)
        await root.mv(relPath, nextPath)
      },
      private: async (node, relPath) => {
        if (FsTypeChecks.isFile(node)) {
          throw new Error("Tried to `mv` within a file")
        }

        const [ _, ...nextPath ] = Path.unwrap(to)
        // TODO FIXME: nextPath is wrong if you use a node that's deeper in the tree.
        await node.mv(relPath, nextPath)
      }
    })

    return this
  }

  /**
   * Resolve a symlink directly.
   * The `get` and `cat` methods will automatically resolve symlinks,
   * but sometimes when working with symlinks directly
   * you might want to use this method instead.
   */
  resolveSymlink(link: SoftLink): Promise<File | Tree | null> {
    if (TypeChecks.hasProp(link, "privateName")) {
      return PrivateTree.resolveSoftLink(this.dependencies.crypto, this.dependencies.depot, this.dependencies.manners, this.dependencies.reference, link)
    } else {
      return PublicTree.resolveSoftLink(this.dependencies.depot, this.dependencies.reference, link)
    }
  }

  async rm(path: DistinctivePath<Partitioned<Partition>>): Promise<this> {
    await this.runMutationOnNode(path, {
      public: async (root, relPath) => {
        await root.rm(relPath)
      },
      private: async (node, relPath) => {
        if (FsTypeChecks.isFile(node)) {
          throw new Error("Cannot `rm` a file you've asked permission for")
        } else {
          await node.rm(relPath)
        }
      }
    })

    return this
  }

  /**
   * Make a symbolic link **at** a path.
   */
  async symlink(args: {
    at: Path.Directory<Partitioned<Partition>>
    referringTo: {
      path: Path.Distinctive<Partitioned<Partition>>
      username?: string
    }
    name: string
  }): Promise<this> {
    const { at, name } = args
    const referringTo = args.referringTo.path
    const username = args.referringTo.username || this.account.username

    if (at == null) throw new Error("Missing parameter `symlink.at`")
    if (Path.isFile(at)) throw new Error("`symlink.at` only accepts directory paths")

    const sameTree = Path.isSamePartition(at, referringTo)

    if (!username) throw new Error("I need a username in order to use this method")
    if (!sameTree) throw new Error("`link` is only supported on the same tree for now")

    await this.runMutationOnNode(at, {
      public: async (root, relPath) => {
        // Skip the pretty tree, we don't need to attach the symlink to that.
        if (BareTree.instanceOf(root)) return
        if (!PublicTree.instanceOf(root)) {
          // TODO
          throw new Error(`Symlinks not supported in WASM-WNFS yet.`)
        } else {
          await this.runOnChildTree(root, relPath, async tree => {
            if (PublicTree.instanceOf(tree)) {
              tree.insertSoftLink({
                path: Path.removePartition(referringTo),
                name,
                username,
              })
            }
            return tree
          })
        }

      },
      private: async (node, relPath) => {
        if (FsTypeChecks.isFile(node)) {
          throw new Error("Cannot add a soft link to a file")
        }

        await this.runOnChildTree(node, relPath, async tree => {
          if (PrivateTree.instanceOf(tree)) {
            const destNode: PrivateTree | PrivateFile | null = await this.runOnNode(referringTo, {
              public: async () => {
                // This should be impossible at the moment
                throw new Error(`File system hit a public node within a private node. This is not supported/this should not happen.`)
              },
              private: async (a, relPath) => {
                const b = FsTypeChecks.isFile(a)
                  ? a
                  : await a.get(relPath)

                if (PrivateTree.instanceOf(b)) return b
                else if (PrivateFile.instanceOf(b)) return b
                else throw new Error("`symlink.referringTo` is not of the right type")
              }
            })

            if (!destNode) throw new Error("Could not find the item the symlink is referring to")

            tree.insertSoftLink({
              name,
              username,
              key: destNode.key,
              privateName: await destNode.getName()
            })
          }
          return tree
        })
      }
    })

    return this
  }


  // PUBLISH
  // -------

  /**
   * Ensures the latest version of the file system is added to IPFS,
   * updates your data root, and returns the root CID.
   */
  async publish(): Promise<CID> {
    const proofs = Array.from(Object.entries(this.proofs))
    this.proofs = {}

    const cid = await this.root.put()

    proofs.forEach(([ _, proof ]) => {
      this.publishHooks.forEach(hook => hook(cid, proof))
    })

    return cid
  }


  // HISTORY STEPPING
  // ----------------
  /**
   * Ensures the current version of your file system is "committed"
   * and stepped forward, so the current version will always be
   * persisted as an "step" in the history of the file system.
   *
   * This function is implicitly called every time your file system
   * changes are synced, so in most cases calling this is handled
   * for you.
   */
  async historyStep(): Promise<void> {
    const publicTree = this.root.publicTree
    if (TypeChecks.hasProp(publicTree, "historyStep") && typeof publicTree.historyStep === "function") {
      // this function is not available in lower versions.
      await publicTree.historyStep()
    }
  }


  // SHARING
  // -------

  /**
   * Accept a share.
   * Copies the links to the items into your 'Shared with me' directory.
   * eg. `private/Shared with me/Sharer/`
   */
  async acceptShare({ shareId, sharedBy }: { shareId: string; sharedBy: string }): Promise<this> {
    const share = await this.loadShare({ shareId, sharedBy })
    await this.write(
      Path.directory(RootBranch.Private, "Shared with me", sharedBy),
      await share.ls([]).then(Object.values).then(links => links.filter(FsTypeChecks.isSoftLink))
    )
    return this
  }

  /**
   * Loads a share.
   * Returns a "entry index", in other words,
   * a private tree with symlinks (soft links) to the shared items.
   */
  async loadShare({ shareId, sharedBy }: { shareId: string; sharedBy: string }): Promise<UnixTree> {
    const ourExchangeDid = await DID.exchange(this.dependencies.crypto)
    const theirRootDid = await this.dependencies.reference.didRoot.lookup(sharedBy)

    // Share key
    const key = await ShareKey.create(this.dependencies.crypto, {
      counter: parseInt(shareId, 10),
      recipientExchangeDid: ourExchangeDid,
      senderRootDid: theirRootDid
    })

    // Load their shared section
    const root = await this.dependencies.reference.dataRoot.lookup(sharedBy)
    if (!root) throw new Error("This user doesn't have a filesystem yet.")

    const rootLinks = await Protocol.basic.getSimpleLinks(this.dependencies.depot, root)
    const sharedLinksCid = rootLinks[ RootBranch.Shared ]?.cid || null
    if (!sharedLinksCid) throw new Error("This user hasn't shared anything yet.")

    const sharedLinks = await RootTree.getSharedLinks(this.dependencies.depot, decodeCID(sharedLinksCid))
    const shareLink = TypeChecks.isObject(sharedLinks) ? sharedLinks[ key ] : null
    if (!shareLink) throw new Error("Couldn't find a matching share.")

    const shareLinkCid = TypeChecks.isObject(shareLink) ? shareLink.cid : null
    if (!shareLinkCid) throw new Error("Couldn't find a matching share.")

    const sharePayload = await this.dependencies.depot.getBlock(decodeCID(shareLinkCid))

    // Decode payload
    const decryptedPayload = await this.dependencies.crypto.keystore.decrypt(sharePayload)
    const decodedPayload: Record<string, unknown> = cbor.decode(decryptedPayload)

    if (!TypeChecks.hasProp(decodedPayload, "cid")) throw new Error("Share payload is missing the `cid` property")
    if (!TypeChecks.hasProp(decodedPayload, "key")) throw new Error("Share payload is missing the `key` property")
    if (!TypeChecks.hasProp(decodedPayload, "algo")) throw new Error("Share payload is missing the `algo` property")

    const entryIndexCid: string = decodedPayload.cid as string
    const symmKey: Uint8Array = decodedPayload.key as Uint8Array
    const symmKeyAlgo: string = decodedPayload.algo as string

    // Load MMPT
    const mmptCid = rootLinks[ RootBranch.Private ]?.cid
    if (!mmptCid) throw new Error("This user's filesystem doesn't have a private branch")
    const theirMmpt = await MMPT.fromCID(
      this.dependencies.depot,
      decodeCID(rootLinks[ RootBranch.Private ]?.cid)
    )

    // Decode index
    const encryptedIndex = await this.dependencies.depot.getBlock(decodeCID(entryIndexCid))
    const indexInfoBytes = await this.dependencies.crypto.aes.decrypt(encryptedIndex, symmKey, symmKeyAlgo as SymmAlg)
    const indexInfo = JSON.parse(uint8arrays.toString(indexInfoBytes, "utf8"))
    if (!PrivateTypeChecks.isDecryptedNode(indexInfo)) throw new Error("The share payload did not point to a valid entry index")

    // Load index and return it
    return PrivateTree.fromInfo(
      this.dependencies.crypto,
      this.dependencies.depot,
      this.dependencies.manners,
      this.dependencies.reference,
      theirMmpt,
      symmKey,
      indexInfo)
  }

  /**
   * Share a private file with a user.
   */
  async sharePrivate(paths: Path.Distinctive<Path.PartitionedNonEmpty<Path.Private>>[], { sharedBy, shareWith }: { sharedBy?: SharedBy; shareWith: string | string[] }): Promise<ShareDetails> {
    const verifiedPaths = paths.filter(path => {
      return Path.isOnRootBranch(Path.RootBranch.Private, path)
    })

    // Our username
    if (!sharedBy) {
      if (!this.account.username) throw new Error("I need a username in order to use this method")
      sharedBy = { rootDid: this.account.rootDID, username: this.account.username }
    }

    // Get the items to share
    const items = await verifiedPaths.reduce(async (promise: Promise<[ string, PrivateFile | PrivateTree ][]>, path) => {
      const acc = await promise
      const name = Path.terminus(path)
      const item = await this.get(path)
      return name && (PrivateFile.instanceOf(item) || PrivateTree.instanceOf(item))
        ? [ ...acc, [ name, item ] as [ string, PrivateFile | PrivateTree ] ]
        : acc
    }, Promise.resolve([]))

    // No items?
    if (!items.length) throw new Error("Didn't find any items to share")

    // Share the items
    const shareDetails = await Sharing.privateNode(
      this.dependencies.crypto,
      this.dependencies.depot,
      this.dependencies.manners,
      this.dependencies.reference,
      this.root,
      items,
      { shareWith, sharedBy }
    )

    // Bump the counter
    await this.root.bumpSharedCounter()

    // Publish
    await this.root.updatePuttable(RootBranch.Private, this.root.mmpt)
    await this.publish()

    // Fin
    return shareDetails
  }


  // INTERNAL
  // --------

  /** @internal */
  async checkMutationPermissionAndAddProof(path: DistinctivePath<Partitioned<Partition>>, isMutation: boolean): Promise<void> {
    const operation = isMutation ? "make changes to" : "query"

    if (!this.localOnly) {
      const proof = await this.dependencies.reference.repositories.ucans.lookupFilesystemUcan(path)

      if (!proof || Ucan.isExpired(proof) || !proof.signature) {
        throw new NoPermissionError(`I don't have the necessary permissions to ${operation} the file system at "${Path.toPosix(path)}"`)
      }

      this.proofs[ proof.signature ] = proof
    }
  }

  /** @internal */
  async runMutationOnNode(
    path: DistinctivePath<Partitioned<Partition>>,
    handlers: {
      public(root: UnixTree, relPath: Path.Segments): Promise<void>
      private(node: PrivateTree | PrivateFile, relPath: Path.Segments): Promise<void>
    },
  ): Promise<void> {
    const parts = Path.unwrap(path)
    const head = parts[ 0 ]
    const relPath = parts.slice(1)

    await this.checkMutationPermissionAndAddProof(path, true)

    if (head === RootBranch.Public) {
      await handlers.public(this.root.publicTree, relPath)
      await handlers.public(this.root.prettyTree, relPath)

      await Promise.all([
        this.root.updatePuttable(RootBranch.Public, this.root.publicTree),
        this.root.updatePuttable(RootBranch.Pretty, this.root.prettyTree)
      ])

    } else if (head === RootBranch.Private) {
      const [ nodePath, node ] = this.root.findPrivateNode(path)

      if (!node) {
        throw new NoPermissionError(`I don't have the necessary permissions to make changes to the file system at "${Path.toPosix(path)}"`)
      }

      await handlers.private(node, parts.slice(Path.unwrap(nodePath).length))
      await node.put()
      await this.root.updatePuttable(RootBranch.Private, this.root.mmpt)

      const cid = await this.root.mmpt.put()
      await this.root.addPrivateLogEntry(this.dependencies.depot, cid)

    } else if (head === RootBranch.Pretty) {
      throw new Error("The pretty path is read only")

    } else {
      throw new Error("Not a valid FileSystem path")
    }

    this.eventEmitter.emit(
      "fileSystem:local-change",
      { root: await this.root.put(), path }
    )
  }

  /** @internal */
  async runOnNode<A>(
    path: DistinctivePath<Partitioned<Partition>>,
    handlers: {
      public(root: UnixTree, relPath: Path.Segments): Promise<A>
      private(node: Tree | File, relPath: Path.Segments): Promise<A>
    },
  ): Promise<A> {
    const parts = Path.unwrap(path)
    const head = parts[ 0 ]
    const relPath = parts.slice(1)

    await this.checkMutationPermissionAndAddProof(path, false)

    if (head === RootBranch.Public) {
      return await handlers.public(this.root.publicTree, relPath)

    } else if (head === RootBranch.Private) {
      const [ nodePath, node ] = this.root.findPrivateNode(path)

      if (!node) {
        throw new NoPermissionError(`I don't have the necessary permissions to query the file system at "${Path.toPosix(path)}"`)
      }

      return await handlers.private(node, parts.slice(Path.unwrap(nodePath).length))

    } else if (head === RootBranch.Pretty) {
      return await handlers.public(this.root.prettyTree, relPath)

    } else {
      throw new Error("Not a valid FileSystem path")

    }
  }

  /** @internal
  * `put` should be called on the node returned from the function.
  * Normally this is handled by `runOnNode`.
  */
  async runOnChildTree(node: Tree, relPath: Path.Segments, fn: (tree: Tree) => Promise<Tree>): Promise<Tree> {
    let tree = node

    if (relPath.length) {
      if (!await tree.exists(relPath)) await tree.mkdir(relPath)
      const g = await tree.get(relPath)
      if (FsTypeChecks.isTree(g)) tree = g
      else throw new Error("Path does not point to a directory")
    }

    tree = await fn(tree)

    if (relPath.length) return await node.updateChild(tree, relPath)
    return node
  }

  /** @internal */
  _whenOnline(): void {
    const toPublish = [ ...this._publishWhenOnline ]
    this._publishWhenOnline = []

    toPublish.forEach(([ cid, proof ]) => {
      this.publishHooks.forEach(hook => hook(cid, proof))
    })
  }

  /** @internal */
  _beforeLeaving(e: Event): void | string {
    const msg = "Are you sure you want to leave? We don't control the browser so you may lose your data."

    if (this._publishing || this._publishWhenOnline.length) {
      (e || globalThis.event).returnValue = msg as any
      return msg
    }
  }
}


export default FileSystem
