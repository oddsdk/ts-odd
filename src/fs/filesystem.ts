import { throttle } from 'throttle-debounce'

import { SyncHook, UnixTree, Tree, File, BaseLinks } from './types'
import { SemVer } from './semver'
import BareTree from './bare/tree'
import MMPT from './protocol/private/mmpt'
import PublicTree from './v1/PublicTree'
import PrivateTree from './v1/PrivateTree'

import * as cidLog from '../common/cid-log'
import * as dataRoot from '../data-root'
import * as debug from '../common/debug'
import * as keystore from '../keystore'
import * as link from './link'
import * as pathUtil from './path'
import * as ucan from '../ucan'
import * as ucanInternal from '../ucan/internal'

import { AddResult, CID, FileContent } from '../ipfs'
import { NoPermissionError } from '../errors'
import { Permissions } from '../ucan/permissions'
import { Ucan } from '../ucan'


// TYPES


type AppPath =
  (path?: string | Array<string>) => string

type ConstructorParams = {
  root: BareTree
  publicTree: PublicTree
  prettyTree: BareTree
  privateTree: PrivateTree
  mmpt: MMPT
  rootDid: string

  permissions?: Permissions
  localOnly?: boolean
}

type FileSystemOptions = {
  version?: SemVer
  keyName?: string
  permissions?: Permissions
  rootDid?: string
  localOnly?: boolean
}

enum Branch {
  Public = 'public',
  Pretty = 'pretty',
  Private = 'private'
}



// CLASS


export class FileSystem implements UnixTree {

  root: BareTree
  publicTree: PublicTree
  prettyTree: BareTree
  privateTree: PrivateTree
  mmpt: MMPT
  rootDid: string
  localOnly: boolean

  appPath: AppPath | undefined
  proofs: { [_: string]: Ucan }
  syncHooks: Array<SyncHook>
  syncWhenOnline: Array<[CID, string]>


  constructor({ root, publicTree, permissions, prettyTree, privateTree, mmpt, rootDid, localOnly }: ConstructorParams) {
    this.root = root
    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateTree = privateTree
    this.mmpt = mmpt
    this.rootDid = rootDid
    this.localOnly = localOnly || false

    this.proofs = {}
    this.syncHooks = []
    this.syncWhenOnline = []

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
      if (window.navigator.onLine) return dataRoot.update(cid, proof)
      this.syncWhenOnline.push([ cid, proof ])
    }, false)

    this.syncHooks.push(logCid)
    this.syncHooks.push(updateDataRootWhenOnline)

    // Sync when coming back online
    window.addEventListener('online', () => this.whenOnline())
  }


  // INITIALISATION
  // --------------

  /**
   * Creates a file system with an empty public tree & an empty private tree at the root.
   */
  static async empty(opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { keyName = 'filesystem-root', rootDid = '', permissions, localOnly } = opts

    const publicTree = await PublicTree.empty()
    const prettyTree = await BareTree.empty()

    const mmpt = MMPT.create()
    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTree.create(mmpt, key, null)

    const root = await BareTree.empty()

    const fs = new FileSystem({
      root,
      publicTree,
      permissions,
      prettyTree,
      privateTree,
      mmpt,
      rootDid,
      localOnly
    })

    publicTree.onUpdate = result => fs.updateRootLink(Branch.Public, result)
    prettyTree.onUpdate = result => fs.updateRootLink(Branch.Pretty, result)
    privateTree.onUpdate = result => fs.updateRootLink(Branch.Private, result)

    await publicTree.put()
    await prettyTree.put()
    await privateTree.put()

    return fs
  }

  /**
   * Loads an existing file system from a CID.
   */
  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const { keyName = 'filesystem-root', rootDid = '', permissions, localOnly } = opts

    const root = await BareTree.fromCID(cid)

    const publicCID = root.links['public']?.cid || null
    const publicTree = publicCID === null
      ? await PublicTree.empty()
      : await PublicTree.fromCID(publicCID)

    const prettyTree = (await root.getDirectChild('pretty')) as BareTree ||
                        await BareTree.empty()

    const privateCID = root.links['private']?.cid || null
    const key = await keystore.getKeyByName(keyName)

    let mmpt, privateTree
    if(privateCID === null){
      mmpt = await MMPT.create()
      privateTree = await PrivateTree.create(mmpt, key, null)
    }else{
      mmpt = await MMPT.fromCID(privateCID)
      privateTree = await PrivateTree.fromBaseKey(mmpt, key)
    }

    const fs = new FileSystem({
      root,
      publicTree,
      permissions,
      prettyTree,
      privateTree,
      mmpt,
      rootDid,
      localOnly
    })

    publicTree.onUpdate = result => fs.updateRootLink(Branch.Public, result)
    prettyTree.onUpdate = result => fs.updateRootLink(Branch.Pretty, result)
    privateTree.onUpdate = result => fs.updateRootLink(Branch.Private, result)

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
    window.removeEventListener('online', this.whenOnline)
  }


  // POSIX INTERFACE
  // ---------------

  async mkdir(path: string): Promise<this> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.mkdir(relPath)
    })
    return this
  }

  async ls(path: string): Promise<BaseLinks> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.ls(relPath)
    })
  }

  async add(path: string, content: FileContent): Promise<this> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.add(relPath, content)
    })
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

  async write(path: string, content: FileContent): Promise<this> {
    return this.add(path, content)
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
      this.syncHooks.forEach(hook => hook(cid, encodedProof))
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

    if(!this.localOnly) {
      const proof = await ucanInternal.lookupFilesystemUcan(path)
      if (!proof || ucan.isExpired(proof) || !proof.signature) {
        throw new NoPermissionError("I don't have the necessary permissions to make these changes to the file system")
      }

      this.proofs[proof.signature] = proof
    }

    let result: a
    let resultPretty: a

    if (head === 'public') {
      result = await fn(this.publicTree, relPath)

      if (isMutation && PublicTree.instanceOf(result)) {
        resultPretty = await fn(this.prettyTree, relPath)

        this.publicTree = result
        this.prettyTree = resultPretty as unknown as BareTree
      }

    } else if (head === 'private') {
      result = await fn(this.privateTree, relPath)

      if (isMutation && PrivateTree.instanceOf(result)) {
        this.privateTree = result
      }

    } else if (head === 'pretty' && isMutation) {
      throw new Error("The pretty path is read only")

    } else if (head === 'pretty') {
      result = await fn(this.prettyTree, relPath)

    } else {
      throw new Error("Not a valid FileSystem path")

    }

    return result
  }

  /** @internal */
  async updateRootLink(branch: Branch, update: AddResult): Promise<void> {
    this.root.updateLink(link.make(branch, update.cid, false, update.size))
  }

  /** @internal */
  whenOnline(): void {
    const toSync = [...this.syncWhenOnline]
    this.syncWhenOnline = []

    toSync.forEach(([cid, proof]) => {
      this.syncHooks.forEach(hook => hook(cid, proof))
    })
  }
}


export default FileSystem



// ㊙️


function appPath(permissions: Permissions): ((path?: string | Array<string>) => string) {
  return (path?: string | Array<string>): string => (
    'private/Apps/'
      + (permissions.app ? permissions.app.creator + '/' : '')
      + (permissions.app ? permissions.app.name : '')
      + (path ? '/' + (typeof path == 'object' ? path.join('/') : path) : '')
  )
}
