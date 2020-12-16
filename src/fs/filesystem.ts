import { throttle } from 'throttle-debounce'

import { PublishHook, UnixTree, Tree, File } from './types'
import { BaseLinks, Branch } from './types'
import { SemVer } from './semver'
import BareTree from './bare/tree'
import RootTree from './root/tree'
import PublicTree from './v1/PublicTree'
import PrivateTree from './v1/PrivateTree'

import * as cidLog from '../common/cid-log'
import * as dataRoot from '../data-root'
import * as debug from '../common/debug'
import * as keystore from '../keystore'
import * as pathUtil from './path'
import * as ucan from '../ucan'
import * as ucanInternal from '../ucan/internal'

import { Maybe } from '../common'
import { CID, FileContent } from '../ipfs'
import { NoPermissionError } from '../errors'
import { Permissions } from '../ucan/permissions'
import { Ucan } from '../ucan'


// TYPES


type AppPath =
  (path?: string | Array<string>) => string

type ConstructorParams = {
  permissions?: Permissions
  root: RootTree
  localOnly?: boolean
}

type FileSystemOptions = {
  version?: SemVer
  keyName?: string
  permissions?: Permissions
  localOnly?: boolean
}

type MutationOptions = {
  publish?: boolean
}


// CLASS


export class FileSystem {

  root: RootTree
  localOnly: boolean

  appPath: AppPath | undefined
  proofs: { [_: string]: Ucan }
  publishHooks: Array<PublishHook>
  publishWhenOnline: Array<[CID, string]>


  constructor({ root, permissions, localOnly }: ConstructorParams) {
    this.localOnly = localOnly || false
    this.proofs = {}
    this.publishHooks = []
    this.publishWhenOnline = []
    this.root = root

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
    const logCid = (cid: CID) => {
      cidLog.add(cid)
      debug.log("📓 Adding to the CID ledger:", cid)
    }

    // Update the user's data root when making changes
    const updateDataRootWhenOnline = throttle(3000, false, (cid, proof) => {
      if (globalThis.navigator.onLine) return dataRoot.update(cid, proof)
      this.publishWhenOnline.push([ cid, proof ])
    }, false)

    this.publishHooks.push(logCid)
    this.publishHooks.push(updateDataRootWhenOnline)

    // Publish when coming back online
    globalThis.addEventListener('online', () => this._whenOnline())
  }


  // INITIALISATION
  // --------------

  /**
   * Creates a file system with an empty public tree & an empty private tree at the root.
   */
  static async empty(opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { keyName = 'filesystem-root', permissions, localOnly } = opts
    const key = await keystore.getKeyByName(keyName)
    const root = await RootTree.empty({ key })

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
    const { keyName = 'filesystem-root', permissions, localOnly } = opts
    const key = await keystore.getKeyByName(keyName)
    const root = await RootTree.fromCID({ cid, key })

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
    globalThis.removeEventListener('online', this._whenOnline)
  }


  // POSIX INTERFACE
  // ---------------

  async mkdir(path: string, options: MutationOptions = {}): Promise<this> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.mkdir(relPath)
    })
    if(options.publish) {
      await this.publish()
    }
    return this
  }

  async ls(path: string): Promise<BaseLinks> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.ls(relPath)
    })
  }

  async add(path: string, content: FileContent, options: MutationOptions = {}): Promise<this> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.add(relPath, content)
    })
    if(options.publish) {
      await this.publish()
    }
    return this
  }

  async cat(path: string): Promise<FileContent> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.cat(relPath)
    })
  }

  async exists(path: string): Promise<boolean> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.exists(relPath)
    })
  }

  async rm(path: string): Promise<this> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.rm(relPath)
    })
    return this
  }

  async get(path: string): Promise<Tree | File | null> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.get(relPath)
    })
  }

  // This is only implemented on the same tree for now and will error otherwise
  async mv(from: string, to: string): Promise<this> {
    const sameTree = pathUtil.sameParent(from, to)
    if (!sameTree) {
      throw new Error("`mv` is only supported on the same tree for now")
    }
    await this.runOnTree(from, true, (tree, relPath) => {
      const { nextPath } = pathUtil.takeHead(to)
      return tree.mv(relPath, nextPath || '')
    })
    return this
  }

  async read(path: string): Promise<FileContent | null> {
    return this.cat(path)
  }

  async write(path: string, content: FileContent, options: MutationOptions = {}): Promise<this> {
    return this.add(path, content, options)
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
      const encodedProof = ucan.encode(proof)
      this.publishHooks.forEach(hook => hook(cid, encodedProof))
    })

    return cid
  }



  // INTERNAL
  // --------

  /** @internal */
  async runOnTree<a>(
    path: string,
    isMutation: boolean,
    fn: (tree: UnixTree, relPath: string) => Promise<a>
  ): Promise<a> {
    const parts = pathUtil.splitParts(path)
    const head = parts[0]
    const relPath = pathUtil.join(parts.slice(1))

    if (!this.localOnly) {
      const proof = await ucanInternal.lookupFilesystemUcan(path)
      if (!proof || ucan.isExpired(proof)) {
        throw new NoPermissionError("I don't have the necessary permissions to make these changes to the file system")
      }

      this.proofs[proof.signature] = proof
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
      result = await fn(this.root.privateTree, relPath)

      if (isMutation && PrivateTree.instanceOf(result)) {
        this.root.privateTree = result
        const cid = await this.root.privateTree.put()
        await this.root.updatePuttable(Branch.Private, this.root.mmpt)
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
    const toPublish = [...this.publishWhenOnline]
    this.publishWhenOnline = []

    toPublish.forEach(([cid, proof]) => {
      this.publishHooks.forEach(hook => hook(cid, proof))
    })
  }
}


export default FileSystem



// ㊙️


function appPath(permissions: Permissions): ((path?: string | Array<string>) => string) {
  return (path?: string | Array<string>): string => (
    `${Branch.Private}/Apps/`
      + (permissions.app ? permissions.app.creator + '/' : '')
      + (permissions.app ? permissions.app.name : '')
      + (path ? '/' + (typeof path == 'object' ? path.join('/') : path) : '')
  )
}
