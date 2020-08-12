import { throttle } from 'throttle-debounce'

import BareTree from './bare/tree'
import PublicTree from './v1/PublicTree'
import PrivateTree from './v1/PrivateTree'
import { Links, SyncHook, FileSystemOptions, Branch, UnixTree } from './types'

import * as cidLog from '../common/cid-log'
import * as dataRoot from '../data-root'
import * as keystore from '../keystore'
import { AddResult, CID, FileContent } from '../ipfs'
import * as pathUtil from './path'
import * as link from './link'


type AppPath = {
  public: (appUuid: string, suffix?: string | Array<string>) => string
  private: (appUuid: string, suffix?: string | Array<string>) => string
}


type ConstructorParams = {
  root: BareTree
  publicTree: PublicTree
  prettyTree: BareTree
  privateTree: PrivateTree
  rootDid: string
}



// CLASS


export class FileSystem {

  root: BareTree
  publicTree: PublicTree
  prettyTree: BareTree
  privateTree: PrivateTree
  rootDid: string

  appPath: AppPath
  syncHooks: Array<SyncHook>
  syncWhenOnline: CID | null


  constructor({ root, publicTree, prettyTree, privateTree, rootDid }: ConstructorParams) {
    this.root = root
    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateTree = privateTree
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
    const updateDataRootWhenOnline = throttle(3000, cid => {
      if (window.navigator.onLine) return dataRoot.update(cid)
      this.syncWhenOnline = cid
    })

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

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTree.create(key)

    const root = await BareTree.empty()

    await root.addChild('public', publicTree)
    await root.addChild('pretty', prettyTree)
    await root.addChild('private', privateTree)

    const fs = new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
      rootDid
    })

    publicTree.onUpdate = result => fs.updateRootLink(Branch.Public, result)
    prettyTree.onUpdate = result => fs.updateRootLink(Branch.Pretty, result)
    privateTree.onUpdate = result => fs.updateRootLink(Branch.Private, result)
    
    return fs
  }

  /**
   * Loads an existing file system from a CID.
   */
  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const { keyName = 'filesystem-root', rootDid = '' } = opts

    const root = await BareTree.fromCID(cid)
    const publicCID = root.links['public']?.cid || null
    const publicTree = publicCID !== null
      ? await PublicTree.fromCID(publicCID)
      : null

    const prettyTree = (await root.getDirectChild('pretty')) as BareTree ||
                        await BareTree.empty()

    const privateCID = root.links['private']?.cid || null
    const key = await keystore.getKeyByName(keyName)
    const privateTree = privateCID !== null
      ? await PrivateTree.fromCID(privateCID, key)
      : null

    if (publicTree === null || privateTree === null) return null

    const fs = new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
      rootDid
    })

    publicTree.onUpdate = result => fs.updateRootLink(Branch.Public, result)
    prettyTree.onUpdate = result => fs.updateRootLink(Branch.Pretty, result)
    privateTree.onUpdate = result => fs.updateRootLink(Branch.Private, result)

    return fs
  }

  static async forUser(username: string, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const cid = await dataRoot.lookup(username)
    return cid ? FileSystem.fromCID(cid, opts) : null
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

  async mkdir(path: string): Promise<CID> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.mkdir(relPath)
    })
    return this.sync()
  }

  async ls(path: string): Promise<Links> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.ls(relPath)
    })
  }

  async add(path: string, content: FileContent): Promise<CID> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.add(relPath, content)
    })
    return this.sync()
  }

  async cat(path: string): Promise<FileContent | null> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.cat(relPath)
    })
  }

  async exists(path: string): Promise<boolean> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.exists(relPath)
    })
  }

  // async get(path: string): Promise<Tree | File | null> {
  //   return this.runOnTree(path, false, (tree, relPath) => {
  //     return tree.get(relPath)
  //   })
  // }

  // async mv(from: string, to: string): Promise<CID> {
  //   const node = await this.get(from)
  //   if (node === null) {
  //     throw new Error(`Path does not exist: ${from}`)
  //   }
  //   const toParts = pathUtil.splitParts(to)
  //   const destPath = pathUtil.join(toParts.slice(0, toParts.length - 1)) // remove file/dir name
  //   const destination = await this.get(destPath)
  //   if (check.isFile(destination)) {
  //     throw new Error(`Can not \`mv\` to a file: ${destPath}`)
  //   }
  //   await this.addChild(to, node)
  //   return this.rm(from)
  // }

  async read(path: string): Promise<FileContent | null> {
    return this.cat(path)
  }

  async rm(path: string): Promise<CID> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.rm(relPath)
    })
    return this.sync()
  }

  async write(path: string, content: FileContent): Promise<CID> {
    if (await this.exists(path)) await this.rm(path)
    return await this.add(path, content)
  }


  /**
   * Ensures the latest version of the file system is added to IPFS and returns the root CID.
   */
  async sync(): Promise<CID> {
    const cid = await this.root.put()

    this.syncHooks.forEach(hook => hook(cid))

    return cid
  }



  // INTERNAL
  // --------

  /** @internal */
  // async addChild(path: string, toAdd: Tree | FileContent): Promise<CID> {
  //   await this.runOnTree(path, true, (tree, relPath) => {
  //     return tree.addChild(relPath, toAdd)
  //   })
  //   return this.sync()
  // }

  /** @internal */
  async runOnTree<a>(
    path: string,
    updateTree: boolean, // ie. do a mutation
    fn: (tree: UnixTree, relPath: string) => Promise<a>
  ): Promise<a> {
    const parts = pathUtil.splitParts(path)
    const head = parts[0]
    const relPath = pathUtil.join(parts.slice(1))

    let result: a
    let resultPretty: a

    if (head === 'public') {
      result = await fn(this.publicTree, relPath)

      if (updateTree && PublicTree.instanceOf(result)) {
        resultPretty = await fn(this.prettyTree, relPath)

        this.publicTree = result
        this.prettyTree = resultPretty as unknown as BareTree
      }

    } else if (head === 'private') {
      result = await fn(this.privateTree, relPath)

      if (updateTree && PrivateTree.instanceOf(result)) {
        this.privateTree = result
        await this.privateTree.put()
        await this.root.addChild('private', this.privateTree)
      }

    } else if (head === 'pretty' && updateTree) {
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
