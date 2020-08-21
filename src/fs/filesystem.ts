import { throttle } from 'throttle-debounce'

import BareTree from './bare/tree'
import PublicTree from './v1/PublicTree'
import PrivateTree from './v1/PrivateTree'
import MMPT from './protocol/private/mmpt'
import { Links, SyncHook, UnixTree, Tree, File } from './types'
import { SemVer } from './semver'

import * as cidLog from '../common/cid-log'
import * as dataRoot from '../data-root'
import * as debug from '../common/debug'
import * as keystore from '../keystore'
import { AddResult, CID, FileContent } from '../ipfs'
import * as pathUtil from './path'
import * as link from './link'


// TYPES

type AppPath = {
  public: (appUuid: string, suffix?: string | Array<string>) => string
  private: (appUuid: string, suffix?: string | Array<string>) => string
}

type ConstructorParams = {
  root: BareTree
  publicTree: PublicTree
  prettyTree: BareTree
  privateTree: PrivateTree
  mmpt: MMPT
  rootDid: string
}

type FileSystemOptions = {
  version?: SemVer
  keyName?: string
  rootDid?: string
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

  appPath: AppPath
  syncHooks: Array<SyncHook>
  syncWhenOnline: CID | null


  constructor({ root, publicTree, prettyTree, privateTree, mmpt, rootDid }: ConstructorParams) {
    this.root = root
    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateTree = privateTree
    this.mmpt = mmpt
    this.rootDid = rootDid
    this.syncHooks = []
    this.syncWhenOnline = null

    this.appPath = {
      public(appUuid: string, suffix?: string | Array<string>): string {
        return appPath("public", appUuid, suffix)
      },
      private(appUuid: string, suffix?: string | Array<string>): string {
        return appPath("private", appUuid, suffix)
      }
    }

    // Add the root CID of the file system to the CID log
    // (reverse list, newest cid first)
    const logCid = cidLog.add

    // Update the user's data root when making changes
    const updateDataRootWhenOnline = throttle(3000, false, cid => {
      debug.log("🚀 Updating your DNSLink:", cid)
      if (window.navigator.onLine) return dataRoot.update(cid)
      this.syncWhenOnline = cid
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
    const { keyName = 'filesystem-root', rootDid = '' } = opts

    const publicTree = await PublicTree.empty()
    const prettyTree = await BareTree.empty()

    const mmpt = MMPT.create()
    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTree.create(mmpt, key, null)

    const root = await BareTree.empty()

    const fs = new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
      mmpt, 
      rootDid
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
    const { keyName = 'filesystem-root', rootDid = '' } = opts

    const root = await BareTree.fromCID(cid)

    const publicCID = root.links['public']?.cid || null
    const publicTree = publicCID === null
      ? await PublicTree.empty()
      : await PublicTree.fromCID(publicCID)

    const prettyTree = (await root.getDirectChild('pretty')) as BareTree ||
                        await BareTree.empty()

    const privateCID = root.links['private']?.cid || null

    const mmpt = privateCID === null
      ? await MMPT.create()
      : await MMPT.fromCID(privateCID)

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTree.fromBaseKey(mmpt, key)

    const fs = new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
      mmpt,
      rootDid
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


  async updateRootLink(branch: Branch, update: AddResult): Promise<void> {
    this.root.updateLink(link.make(branch, update.cid, false, update.size))
  }


  // POSIX INTERFACE
  // ---------------

  async mkdir(path: string): Promise<this> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.mkdir(relPath)
    })
    return this
  }

  async ls(path: string): Promise<Links> {
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
    if(!sameTree) {
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


  /**
   * Ensures the latest version of the file system is added to IPFS and returns the root CID.
   */
  async publicize(): Promise<CID> {
    const cid = await this.root.put()

    this.syncHooks.forEach(hook => hook(cid))

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
  whenOnline(): void {
    if (!this.syncWhenOnline) return
    const cid = this.syncWhenOnline
    this.syncWhenOnline = null
    this.syncHooks.forEach(hook => hook(cid))
  }
}


export default FileSystem


// ㊙️


function appPath(head: string, appUuid: string, suffix?: string | Array<string>): string {
  return (
    head + '/Apps/' +
    encodeURIComponent(appUuid) +
    (suffix ? '/' + (typeof suffix == 'object' ? suffix.join('/') : suffix) : '')
  )
}
