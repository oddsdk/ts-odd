import { throttle } from "throttle-debounce"

import { BaseLinks } from "./types.js"
import { Branch, DistinctivePath, DirectoryPath, FilePath, Path } from "../path.js"
import { PublishHook, UnixTree, Tree, File } from "./types.js"
import { SemVer } from "./semver.js"
import BareTree from "./bare/tree.js"
import RootTree from "./root/tree.js"
import PublicTree from "./v1/PublicTree.js"
import PrivateFile from "./v1/PrivateFile.js"
import PrivateTree from "./v1/PrivateTree.js"

import * as cidLog from "../common/cid-log.js"
import * as dataRoot from "../data-root.js"
import * as debug from "../common/debug.js"
import * as crypto from "../crypto/index.js"
import * as did from "../did/index.js"
import * as pathing from "../path.js"
import * as typeCheck from "./types/check.js"
import * as ucan from "../ucan/index.js"

import { CID, FileContent } from "../ipfs/index.js"
import { NoPermissionError } from "../errors.js"
import { Permissions, appDataPath } from "../ucan/permissions.js"


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
  version?: SemVer
}

type NewFileSystemOptions = FileSystemOptions & {
  rootKey?: string
}

type MutationOptions = {
  publish?: boolean
}


// CONSTANTS


export const EXCHANGE_PATH: DirectoryPath = pathing.directory(
  pathing.Branch.Public,
  ".well-known",
  "exchange"
)


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
      await cidLog.add(cid)
      debug.log("📓 Adding to the CID ledger:", cid)
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
  static async empty(opts: NewFileSystemOptions = {}): Promise<FileSystem> {
    const { permissions, localOnly } = opts
    const rootKey = opts.rootKey || await crypto.aes.genKeyStr()
    const root = await RootTree.empty({ rootKey })

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
  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
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

  async ls(path: DirectoryPath): Promise<BaseLinks> {
    if (pathing.isFile(path)) throw new Error("`ls` only accepts directory paths")
    return this.runOnNode(path, false, (node, relPath) => {
      if (typeCheck.isFile(node)) {
        throw new Error("Tried to `ls` a file")
      } else {
        return node.ls(relPath)
      }
    })
  }

  async mkdir(path: DirectoryPath, options: MutationOptions = {}): Promise<this> {
    if (pathing.isFile(path)) throw new Error("`mkdir` only accepts directory paths")
    await this.runOnNode(path, true, (node, relPath) => {
      if (typeCheck.isFile(node)) {
        throw new Error("Tried to `mkdir` a file")
      } else {
        return node.mkdir(relPath)
      }
    })
    if (options.publish) {
      await this.publish()
    }
    return this
  }

  // POSIX INTERFACE (FILES)
  // -----------------------

  async add(path: FilePath, content: FileContent, options: MutationOptions = {}): Promise<this> {
    if (pathing.isDirectory(path)) throw new Error("`add` only accepts file paths")
    await this.runOnNode(path, true, async (node, relPath) => {
      return typeCheck.isFile(node)
        ? node.updateContent(content)
        : node.add(relPath, content)
    })
    if (options.publish) {
      await this.publish()
    }
    return this
  }

  async cat(path: FilePath): Promise<FileContent> {
    if (pathing.isDirectory(path)) throw new Error("`cat` only accepts file paths")
    return this.runOnNode(path, false, async (node, relPath) => {
      return typeCheck.isFile(node)
        ? node.content
        : node.cat(relPath)
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
    return this.runOnNode(path, false, async (node, relPath) => {
      return typeCheck.isFile(node)
        ? true // tried to check the existance of itself
        : node.exists(relPath)
    })
  }

  async get(path: DistinctivePath): Promise<Tree | File | null> {
    return this.runOnNode(path, false, async (node, relPath) => {
      return typeCheck.isFile(node)
        ? node // tried to get itself
        : node.get(relPath)
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

    await this.runOnNode(from, true, (node, relPath) => {
      if (typeCheck.isFile(node)) {
        throw new Error("Tried to `mv` within a file")
      }

      const [ head, ...nextPath ] = pathing.unwrap(to)
      return node.mv(relPath, nextPath)
    })

    return this
  }

  async rm(path: DistinctivePath): Promise<this> {
    await this.runOnNode(path, true, (node, relPath) => {
      if (typeCheck.isFile(node)) {
        throw new Error("Cannot `rm` a file you've asked permission for")
      } else {
        return node.rm(relPath)
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


  // COMMON
  // ------

  /**
   * Stores the public part of the exchange key in the DID format,
   * in the `/public/.well-known/exchange/*` location.
   */
  async addPublicExchangeKey(): Promise<void> {
    const publicDid = await did.exchange()

    await this.write(
      pathing.combine(EXCHANGE_PATH, pathing.file(publicDid)),
      "{}"
    )
  }

  /**
   * Checks if the public exchange key was added in the well-known location.
   * See `addPublicExchangeKey()` for the exact details.
   */
  async hasPublicExchangeKey(): Promise<boolean> {
    const publicDid = await did.exchange()

    return this.exists(
      pathing.combine(EXCHANGE_PATH, pathing.file(publicDid))
    )
  }


  // INTERNAL
  // --------

  /** @internal */
  async runOnNode<a>(
    path: DistinctivePath,
    isMutation: boolean,
    fn: (node: UnixTree | File, relPath: Path) => Promise<a>
  ): Promise<a> {
    const parts = pathing.unwrap(path)
    const head = parts[0]
    const relPath = parts.slice(1)

    const operation = isMutation
      ? "make changes to"
      : "query"

    if (!this.localOnly) {
      const proof = await ucan.dictionary.lookupFilesystemUcan(path)
      const decodedProof = proof && ucan.decode(proof)

      if (!proof || !decodedProof || ucan.isExpired(decodedProof) || !decodedProof.signature) {
        throw new NoPermissionError(`I don't have the necessary permissions to ${operation} the file system at "${pathing.toPosix(path)}"`)
      }

      this.proofs[decodedProof.signature] = proof
    }

    let result: a
    let resultPretty: a

    if (head === Branch.Public) {
      result = await fn(this.root.publicTree, relPath)

      if (isMutation && PublicTree.instanceOf(result)) {
        resultPretty = await fn(this.root.prettyTree, relPath)

        this.root.publicTree = result
        this.root.prettyTree = resultPretty as unknown as BareTree

        await Promise.all([
          this.root.updatePuttable(Branch.Public, this.root.publicTree),
          this.root.updatePuttable(Branch.Pretty, this.root.prettyTree)
        ])
      }

    } else if (head === Branch.Private) {
      const [nodePath, node] = this.root.findPrivateNode(
        path
      )

      if (!node) {
        throw new NoPermissionError(`I don't have the necessary permissions to ${operation} the file system at "${pathing.toPosix(path)}"`)
      }

      result = await fn(
        node,
        parts.slice(pathing.unwrap(nodePath).length)
      )

      if (
        isMutation &&
        (PrivateTree.instanceOf(result) || PrivateFile.instanceOf(result))
      ) {
        this.root.privateNodes[pathing.toPosix(nodePath)] = result
        await result.put()
        await this.root.updatePuttable(Branch.Private, this.root.mmpt)

        const cid = await this.root.mmpt.put()
        await this.root.addPrivateLogEntry(cid)
      }

    } else if (head === Branch.Pretty && isMutation) {
      throw new Error("The pretty path is read only")

    } else if (head === Branch.Pretty) {
      result = await fn(this.root.prettyTree, relPath)

    } else {
      throw new Error("Not a valid FileSystem path")

    }

    return result
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
