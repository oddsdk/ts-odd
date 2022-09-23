import * as cbor from "@ipld/dag-cbor"
import * as uint8arrays from "uint8arrays"
import { CID } from "multiformats/cid"
import { SymmAlg } from "keystore-idb/types.js"
import { throttle } from "throttle-debounce"

import { Links, PuttableUnixTree, UnixTree } from "./types.js"
import { Branch, DistinctivePath, DirectoryPath, FilePath, Path } from "../path.js"
import { PublishHook, Tree, File, SharedBy, ShareDetails, SoftLink } from "./types.js"
import BareTree from "./bare/tree.js"
import MMPT from "./protocol/private/mmpt.js"
import RootTree from "./root/tree.js"
import PublicTree from "./v1/PublicTree.js"
import PrivateFile from "./v1/PrivateFile.js"
import PrivateTree from "./v1/PrivateTree.js"

import * as cidLog from "../common/cid-log.js"
import * as dataRoot from "../data-root.js"
import * as debug from "../common/debug.js"
import * as crypto from "../crypto/index.js"
import * as did from "../did/index.js"
import * as ipfs from "../ipfs/basic.js"
import * as keystore from "../keystore.js"
import * as pathing from "../path.js"
import * as privateTypeChecks from "./protocol/private/types/check.js"
import * as protocol from "./protocol/index.js"
import * as shareKey from "./protocol/shared/key.js"
import * as sharing from "./share.js"
import * as typeCheck from "./types/check.js"
import * as typeChecks from "../common/type-checks.js"
import * as ucan from "../ucan/index.js"
import * as versions from "./versions.js"

import { FileContent } from "../ipfs/index.js"
import { NoPermissionError } from "../errors.js"
import { Permissions, appDataPath } from "../ucan/permissions.js"
import { authenticatedUsername, decodeCID } from "../common/index.js"
import { setup } from "../setup/internal.js"


// TYPES


interface AppPath {
  (): DirectoryPath
  (path: DirectoryPath): DirectoryPath
  (path: FilePath): FilePath
}

type ConstructorParams = {
  localOnly?: boolean
  permissions?: Permissions
  root: RootTree
}

type FileSystemOptions = {
  localOnly?: boolean
  permissions?: Permissions
}

type NewFileSystemOptions = FileSystemOptions & {
  rootKey?: string
}

type MutationOptions = {
  publish?: boolean
}


// CLASS


export class FileSystem {

  root: RootTree
  readonly localOnly: boolean

  appPath: AppPath | undefined
  proofs: { [_: string]: string }
  publishHooks: Array<PublishHook>

  _publishWhenOnline: Array<[CID, string]>
  _publishing: false | [CID, true]


  constructor({ root, permissions, localOnly }: ConstructorParams) {
    this.localOnly = localOnly || false
    this.proofs = {}
    this.publishHooks = []
    this.root = root

    this._publishWhenOnline = []
    this._publishing = false

    this._whenOnline = this._whenOnline.bind(this)
    this._beforeLeaving = this._beforeLeaving.bind(this)

    const globe = (globalThis as any)
    globe.filesystems = globe.filesystems || []
    globe.filesystems.push(this)

    if (
      permissions &&
      permissions.app &&
      permissions.app.creator &&
      permissions.app.name
    ) {
      this.appPath = appPath(permissions)
    }

    // Add the root CID of the file system to the CID log
    // (reverse list, newest cid first)
    const logCid = async (cid: CID) => {
      await cidLog.add(cid.toString())
      debug.log("📓 Adding to the CID ledger:", cid.toString())
    }

    // Update the user's data root when making changes
    const updateDataRootWhenOnline = throttle(3000, false, (cid, proof) => {
      if (globalThis.navigator.onLine) {
        this._publishing = [cid, true]
        return dataRoot.update(cid, proof).then(() => {
          if (this._publishing && this._publishing[0] === cid) {
            this._publishing = false
          }
        })
      }

      this._publishWhenOnline.push([cid, proof])
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
  static async empty(opts: NewFileSystemOptions = {}): Promise<FileSystem> {
    const { permissions, localOnly } = opts
    const rootKey = opts.rootKey || await crypto.aes.genKeyStr()
    // create a file system based on wnfs-wasm when this option is set:
    const wnfsWasm = setup.fsVersion === versions.toString(versions.wnfsWasm)
    const root = await RootTree.empty({ rootKey, wnfsWasm })

    const fs = new FileSystem({
      root,
      permissions,
      localOnly
    })

    return fs
  }

  /**
   * Loads an existing file system from a CID.
   */
  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { permissions, localOnly } = opts
    const root = await RootTree.fromCID({ cid, permissions })

    const fs = new FileSystem({
      root,
      permissions,
      localOnly
    })

    return fs
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
    const globe = (globalThis as any)
    globe.filesystems = globe.filesystems.filter((a: FileSystem) => a !== this)
    globe.removeEventListener("online", this._whenOnline)
    globe.removeEventListener("beforeunload", this._beforeLeaving)
  }


  // POSIX INTERFACE (DIRECTORIES)
  // -----------------------------

  async ls(path: DirectoryPath): Promise<Links> {
    if (pathing.isFile(path)) throw new Error("`ls` only accepts directory paths")
    return this.runOnNode(path, {
      public: async (root, relPath) => {
        return root.ls(relPath)
      },
      private: async (node, relPath) => {
        if (typeCheck.isFile(node)) {
          throw new Error("Tried to `ls` a file")
        } else {
          return node.ls(relPath)
        }
      }
    })
  }

  async mkdir(path: DirectoryPath, options: MutationOptions = {}): Promise<this> {
    if (pathing.isFile(path)) throw new Error("`mkdir` only accepts directory paths")

    await this.runMutationOnNode(path, {
      public: async (root: BareTree, relPath) => {
        await root.mkdir(relPath)
      },
      private: async (node, relPath) => {
        if (typeCheck.isFile(node)) {
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

  async add(
    path: DistinctivePath,
    content: FileContent | SoftLink | SoftLink[] | Record<string, SoftLink>,
    options: MutationOptions = {}
  ): Promise<this> {
    const contentIsSoftLinks = typeCheck.isSoftLink(content)
      || typeCheck.isSoftLinkDictionary(content)
      || typeCheck.isSoftLinkList(content)

    if (contentIsSoftLinks) {
      if (pathing.isFile(path)) {
        throw new Error("Can't add soft links to a file")
      }

      await this.runMutationOnNode(path, {
        public: async (root, relPath) => {
          const links = Array.isArray(content)
            ? content
            : typeChecks.isObject(content)
              ? Object.values(content) as Array<SoftLink>
              : [content] as Array<SoftLink>

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
            : typeChecks.isObject(content)
              ? Object.values(content) as Array<SoftLink>
              : [content] as Array<SoftLink>

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
      if (pathing.isDirectory(path)) {
        throw new Error("`add` only accepts file paths when working with regular files")
      }

      await this.runMutationOnNode(path, {
        public: async (root, relPath) => {
          await root.add(relPath, content)
        },
        private: async (node, relPath) => {
          const destinationIsFile = typeCheck.isFile(node)

          if (destinationIsFile) {
            await node.updateContent(content as FileContent)

          } else {
            await node.add(relPath, content as FileContent)
          }
        }
      })
    }

    if (options.publish) {
      await this.publish()
    }
    return this
  }

  async cat(path: FilePath): Promise<FileContent> {
    if (pathing.isDirectory(path)) throw new Error("`cat` only accepts file paths")
    return this.runOnNode(path, {
      public: async (root, relPath) => {
        return await root.cat(relPath)
      },
      private: async (node, relPath) => {
        return typeCheck.isFile(node)
          ? node.content
          : await node.cat(relPath)
      }
    })
  }

  async read(path: FilePath): Promise<FileContent | null> {
    if (pathing.isDirectory(path)) throw new Error("`read` only accepts file paths")
    return this.cat(path)
  }

  async write(path: FilePath, content: FileContent, options: MutationOptions = {}): Promise<this> {
    if (pathing.isDirectory(path)) throw new Error("`write` only accepts file paths")
    return this.add(path, content, options)
  }


  // POSIX INTERFACE (GENERAL)
  // -------------------------

  async exists(path: DistinctivePath): Promise<boolean> {
    return this.runOnNode(path, {
      public: async (root, relPath) => {
        return await root.exists(relPath)
      },
      private: async (node, relPath) => {
        // node is a file, then we tried to check the existance of itself
        return typeCheck.isFile(node) || await node.exists(relPath)
      }
    })
  }

  async get(path: DistinctivePath): Promise<PuttableUnixTree | File | null> {
    return this.runOnNode(path, {
      public: async (root, relPath) => {
        return await root.get(relPath)
      },
      private: async (node, relPath) => {
        return typeCheck.isFile(node)
          ? node // tried to get itself
          : await node.get(relPath)
      }
    })
  }

  // This is only implemented on the same tree for now and will error otherwise
  async mv(from: DistinctivePath, to: DistinctivePath): Promise<this> {
    const sameTree = pathing.isSameBranch(from, to)

    if (!pathing.isSameKind(from, to)) {
      const kindFrom = pathing.kind(from)
      const kindTo = pathing.kind(to)
      throw new Error(`Can't move to a different kind of path, from is a ${kindFrom} and to is a ${kindTo}`)
    }

    if (!sameTree) {
      throw new Error("`mv` is only supported on the same tree for now")
    }

    if (await this.exists(to)) {
      throw new Error("Destination already exists")
    }

    await this.runOnNode(from, {
      public: async (root, relPath) => {
        const [_, ...nextPath] = pathing.unwrap(to)
        await root.mv(relPath, nextPath)
      },
      private: async (node, relPath) => {
        if (typeCheck.isFile(node)) {
          throw new Error("Tried to `mv` within a file")
        }

        const [_, ...nextPath] = pathing.unwrap(to)
        // TODO FIXME: nextPath is wrong if you use a node that's deeper in the tree.
        await node.mv(relPath, nextPath)
      }
    })

    return this
  }

  async rm(path: DistinctivePath): Promise<this> {
    await this.runMutationOnNode(path, {
      public: async (root, relPath) => {
        await root.rm(relPath)
      },
      private: async (node, relPath) => {
        if (typeCheck.isFile(node)) {
          throw new Error("Cannot `rm` a file you've asked permission for")
        } else {
          await node.rm(relPath)
        }
      }
    })

    return this
  }

  /**
   * Make an internal symbolic link **at** a path.
   */
  async symlink(
    args:
      { at: DirectoryPath; referringTo: DistinctivePath; name: string; username?: string }
  ): Promise<this> {
    const { at, referringTo, name } = args

    if (at == null) throw new Error("Missing parameter `symlink.at`")
    if (pathing.isFile(at)) throw new Error("`symlink.at` only accepts directory paths")

    const username = args.username || await authenticatedUsername()
    const sameTree = pathing.isSameBranch(at, referringTo)

    if (!username) throw new Error("I need a username in order to use this method")
    if (!sameTree) throw new Error("`link` is only supported on the same tree for now")

    const canShare = ucan.dictionary.lookupFilesystemUcan(
      pathing.directory(pathing.Branch.Shared)
    )

    if (!canShare) throw new Error("Not allowed to share private items")

    await this.runMutationOnNode(at, {
      public: async (root, relPath) => {
        if (BareTree.instanceOf(root)) {
          return // skip the pretty tree, we don't need to attach the symlink to that.
        }
        if (!PublicTree.instanceOf(root)) {
          // TODO
          throw new Error(`Symlinks not supported in WASM-WNFS yet.`)
        } else {
          await this.runOnChildTree(root, relPath, async tree => {
            if (PublicTree.instanceOf(tree)) {
              tree.insertSoftLink({
                path: pathing.removeBranch(referringTo),
                name,
                username
              })
            }
            return tree
          })
        }

      },
      private: async (node, relPath) => {
        if (typeCheck.isFile(node)) {
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
                const b = typeCheck.isFile(a)
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

    proofs.forEach(([_, proof]) => {
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
    if (typeChecks.hasProp(publicTree, "historyStep") && typeof publicTree.historyStep === "function") {
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
    await this.add(
      pathing.directory(Branch.Private, "Shared with me", sharedBy),
      await share.ls([])
    )
    return this
  }

  /**
   * Loads a share.
   * Returns a "entry index", in other words,
   * a private tree with symlinks (soft links) to the shared items.
   */
  async loadShare({ shareId, sharedBy }: { shareId: string; sharedBy: string }): Promise<PrivateTree> {
    const ourExchangeDid = await did.exchange()
    const theirRootDid = await did.root(sharedBy)

    // Share key
    const key = await shareKey.create({
      counter: parseInt(shareId, 10),
      recipientExchangeDid: ourExchangeDid,
      senderRootDid: theirRootDid
    })

    // Load their shared section
    const root = await dataRoot.lookup(sharedBy)
    if (!root) throw new Error("This user doesn't have a filesystem yet.")

    const rootLinks = await protocol.basic.getSimpleLinks(root)
    const sharedLinksCid = rootLinks[Branch.Shared]?.cid || null
    if (!sharedLinksCid) throw new Error("This user hasn't shared anything yet.")

    const sharedLinks = await RootTree.getSharedLinks(decodeCID(sharedLinksCid))
    const shareLink = typeChecks.isObject(sharedLinks) ? sharedLinks[key] : null
    if (!shareLink) throw new Error("Couldn't find a matching share.")

    const shareLinkCid = typeChecks.isObject(shareLink) ? shareLink.cid : null
    if (!shareLinkCid) throw new Error("Couldn't find a matching share.")

    const sharePayload = await ipfs.catBuf(decodeCID(shareLinkCid))

    // Decode payload
    const ks = await keystore.get()
    const exchangeKey = await ks.exchangeKey()

    if (!exchangeKey.privateKey) throw new Error("Missing private key in exchange key-pair")

    const decryptedPayload = await crypto.rsa.decrypt(sharePayload, exchangeKey.privateKey)
    const decodedPayload: Record<string, unknown> = cbor.decode(new Uint8Array(decryptedPayload))

    if (!typeChecks.hasProp(decodedPayload, "cid")) throw new Error("Share payload is missing the `cid` property")
    if (!typeChecks.hasProp(decodedPayload, "key")) throw new Error("Share payload is missing the `key` property")
    if (!typeChecks.hasProp(decodedPayload, "algo")) throw new Error("Share payload is missing the `algo` property")

    const entryIndexCid: string = decodedPayload.cid as string
    const symmKey: string = uint8arrays.toString(decodedPayload.key as Uint8Array, "base64pad")
    const symmKeyAlgo: string = decodedPayload.algo as string

    // Load MMPT
    const mmptCid = rootLinks[Branch.Private]?.cid
    if (!mmptCid) throw new Error("This user's filesystem doesn't have a private branch")
    const theirMmpt = await MMPT.fromCID(decodeCID(rootLinks[Branch.Private]?.cid))

    // Decode index
    const encryptedIndex = await ipfs.catBuf(decodeCID(entryIndexCid))
    const indexInfoBytes = await crypto.aes.decrypt(encryptedIndex, symmKey, symmKeyAlgo as SymmAlg)
    const indexInfo = JSON.parse(uint8arrays.toString(indexInfoBytes, "utf8"))
    if (!privateTypeChecks.isDecryptedNode(indexInfo)) throw new Error("The share payload did not point to a valid entry index")

    // Load index and return it
    const index = await PrivateTree.fromInfo(theirMmpt, symmKey, indexInfo)
    return index
  }

  /**
   * Share a private file with a user.
   */
  async sharePrivate(paths: DistinctivePath[], { sharedBy, shareWith }: { sharedBy?: SharedBy; shareWith: string | string[] }): Promise<ShareDetails> {
    const verifiedPaths = paths.filter(path => {
      return pathing.isBranch(pathing.Branch.Private, path)
    })

    // Our username
    if (!sharedBy) {
      const username = await authenticatedUsername()
      if (!username) throw new Error("I need a username in order to use this method")
      sharedBy = { rootDid: await did.ownRoot(), username }
    }

    // Get the items to share
    const items = await verifiedPaths.reduce(async (promise: Promise<[string, PrivateFile | PrivateTree][]>, path) => {
      const acc = await promise
      const name = pathing.terminus(path)
      const item = await this.get(path)
      return name && (PrivateFile.instanceOf(item) || PrivateTree.instanceOf(item))
        ? [...acc, [name, item] as [string, PrivateFile | PrivateTree]]
        : acc
    }, Promise.resolve([]))

    // No items?
    if (!items.length) throw new Error("Didn't find any items to share")

    // Share the items
    const shareDetails = await sharing.privateNode(
      this.root,
      items,
      { shareWith, sharedBy }
    )

    // Bump the counter
    await this.root.bumpSharedCounter()

    // Publish
    await this.root.updatePuttable(Branch.Private, this.root.mmpt)
    await this.publish()

    // Fin
    return shareDetails
  }


  // COMMON
  // ------

  /**
   * Stores the public part of the exchange key in the DID format,
   * in the `/public/.well-known/exchange/DID_GOES_HERE/` directory.
   */
  async addPublicExchangeKey(): Promise<void> {
    const publicDid = await did.exchange()

    await this.mkdir(
      pathing.combine(sharing.EXCHANGE_PATH, pathing.directory(publicDid))
    )
  }

  /**
   * Checks if the public exchange key was added in the well-known location.
   * See `addPublicExchangeKey()` for the exact details.
   */
  async hasPublicExchangeKey(): Promise<boolean> {
    const publicDid = await did.exchange()

    return this.exists(
      pathing.combine(sharing.EXCHANGE_PATH, pathing.directory(publicDid))
    )
  }

  /**
   * Resolve a symlink directly.
   * The `get` and `cat` methods will automatically resolve symlinks,
   * but sometimes when working with symlinks directly
   * you might want to use this method instead.
   */
  resolveSymlink(link: SoftLink): Promise<File | Tree | null> {
    if (typeChecks.hasProp(link, "privateName")) {
      return PrivateTree.resolveSoftLink(link)
    } else {
      return PublicTree.resolveSoftLink(link)
    }
  }


  // INTERNAL
  // --------

  /** @internal */
  async checkMutationPermissionAndAddProof(path: DistinctivePath, isMutation: boolean): Promise<void> {
    const operation = isMutation ? "make changes to" : "query"

    if (!this.localOnly) {
      const proof = await ucan.dictionary.lookupFilesystemUcan(path)
      const decodedProof = proof && ucan.decode(proof)

      if (!proof || !decodedProof || ucan.isExpired(decodedProof) || !decodedProof.signature) {
        throw new NoPermissionError(`I don't have the necessary permissions to ${operation} the file system at "${pathing.toPosix(path)}"`)
      }

      this.proofs[decodedProof.signature] = proof
    }
  }

  /** @internal */
  async runMutationOnNode(
    path: DistinctivePath,
    handlers: {
      public(root: UnixTree, relPath: Path): Promise<void>
      private(node: PrivateTree | PrivateFile, relPath: Path): Promise<void>
    },
  ): Promise<void> {
    const parts = pathing.unwrap(path)
    const head = parts[0]
    const relPath = parts.slice(1)

    await this.checkMutationPermissionAndAddProof(path, true)

    if (head === Branch.Public) {
      await handlers.public(this.root.publicTree, relPath)
      await handlers.public(this.root.prettyTree, relPath)

      await Promise.all([
        this.root.updatePuttable(Branch.Public, this.root.publicTree),
        this.root.updatePuttable(Branch.Pretty, this.root.prettyTree)
      ])

    } else if (head === Branch.Private) {
      const [nodePath, node] = this.root.findPrivateNode(path)

      if (!node) {
        throw new NoPermissionError(`I don't have the necessary permissions to make changes to the file system at "${pathing.toPosix(path)}"`)
      }

      await handlers.private(node, parts.slice(pathing.unwrap(nodePath).length))
      await node.put()
      await this.root.updatePuttable(Branch.Private, this.root.mmpt)

      const cid = await this.root.mmpt.put()
      await this.root.addPrivateLogEntry(cid)

    } else if (head === Branch.Pretty) {
      throw new Error("The pretty path is read only")

    } else {
      throw new Error("Not a valid FileSystem path")
    }
  }

  /** @internal */
  async runOnNode<A>(
    path: DistinctivePath,
    handlers: {
      public(root: UnixTree, relPath: Path): Promise<A>
      private(node: Tree | File, relPath: Path): Promise<A>
    },
  ): Promise<A> {
    const parts = pathing.unwrap(path)
    const head = parts[0]
    const relPath = parts.slice(1)

    await this.checkMutationPermissionAndAddProof(path, false)

    if (head === Branch.Public) {
      return await handlers.public(this.root.publicTree, relPath)

    } else if (head === Branch.Private) {
      const [nodePath, node] = this.root.findPrivateNode(path)

      if (!node) {
        throw new NoPermissionError(`I don't have the necessary permissions to query the file system at "${pathing.toPosix(path)}"`)
      }

      return await handlers.private(node, parts.slice(pathing.unwrap(nodePath).length))

    } else if (head === Branch.Pretty) {
      return await handlers.public(this.root.prettyTree, relPath)

    } else {
      throw new Error("Not a valid FileSystem path")

    }
  }

  /** @internal
  * `put` should be called on the node returned from the function.
  * Normally this is handled by `runOnNode`.
  */
  async runOnChildTree(node: Tree, relPath: Path, fn: (tree: Tree) => Promise<Tree>): Promise<Tree> {
    let tree = node

    if (relPath.length) {
      if (!await tree.exists(relPath)) await tree.mkdir(relPath)
      const g = await tree.get(relPath)
      if (typeCheck.isTree(g)) tree = g
      else throw new Error("Path does not point to a directory")
    }

    tree = await fn(tree)

    if (relPath.length) return await node.updateChild(tree, relPath)
    return node
  }

  /** @internal */
  _whenOnline(): void {
    const toPublish = [...this._publishWhenOnline]
    this._publishWhenOnline = []

    toPublish.forEach(([cid, proof]) => {
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



// ㊙️


function appPath(permissions: Permissions): AppPath {
  if (!permissions.app) throw Error("Only works with app permissions")
  const base = appDataPath(permissions.app)

  return ((path?: DistinctivePath) => {
    if (path) return pathing.combine(base, path)
    return base
  }) as unknown as AppPath
}
