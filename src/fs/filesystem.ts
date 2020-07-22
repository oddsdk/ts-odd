import { throttle } from 'throttle-debounce'

import BareTree from './bare/tree'
import PublicTree from './v1/PublicTree'
import PrivateTree from './v1/PrivateTree'
import { File, Tree, Links, SyncHook, FileSystemOptions, HeaderTree, PinMap } from './types'
import check from './types/check'
import * as pathUtil from './path'

import * as dataRoot from '../data-root'
import * as keystore from '../keystore'
import { CID, FileContent } from '../ipfs'
import { asyncWaterfall } from '../common/util'
import { pinMapToLinks } from './pins'


type ConstructorParams = {
  root: Tree
  publicTree: HeaderTree
  prettyTree: BareTree
  privateTree: HeaderTree
  pinsTree: BareTree
  rootDid: string
}


export class FileSystem {

  root: Tree
  publicTree: HeaderTree
  prettyTree: BareTree
  privateTree: HeaderTree
  pinsTree: BareTree
  rootDid: string
  syncHooks: Array<SyncHook>
  syncWhenOnline: CID | null


  constructor({ root, publicTree, prettyTree, privateTree, pinsTree, rootDid }: ConstructorParams) {
    this.root = root
    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateTree = privateTree
    this.pinsTree = pinsTree
    this.rootDid = rootDid
    this.syncHooks = []
    this.syncWhenOnline = null

    // Update the user's data root when making changes
    const syncHook = throttle(5000, cid => {
      if (window.navigator.onLine) return dataRoot.update(cid)
      this.syncWhenOnline = cid
    })

    this.syncHooks.push(syncHook)

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

    const root = await BareTree.empty()
    const publicTree = await PublicTree.empty(null)
    const prettyTree = await BareTree.empty()
    const pinsTree = await BareTree.empty()

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTree.empty(key)

    await root.addChild('public', publicTree)
    await root.addChild('pretty', prettyTree)
    await root.addChild('private', privateTree)
    await root.addChild('pins', pinsTree)

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
      pinsTree,
      rootDid
    })
  }

  /**
   * Loads an existing file system from a CID.
   */
  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const { keyName = 'filesystem-root', rootDid = '' } = opts

    const root = await BareTree.fromCID(cid)
    const publicCID = root.findLinkCID('public')
    const publicTree = publicCID !== null
      ? await PublicTree.fromCID(publicCID, null)
      : null

    const prettyTree = (await root.getDirectChild('pretty')) as BareTree ||
      await BareTree.empty()
    const pinsTree = (await root.getDirectChild('pins')) as BareTree ||
      await BareTree.empty()

    const privateCID = root.findLinkCID('private')
    const key = await keystore.getKeyByName(keyName)
    const privateTree = privateCID !== null
      ? await PrivateTree.fromCID(privateCID, key)
      : null

    if (publicTree === null || privateTree === null) return null

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
      pinsTree,
      rootDid
    })
  }

  /**
   * Upgrade public IPFS folder to FileSystem
   */
  static async upgradePublicCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { keyName = 'filesystem-root' } = opts

    const root = await PublicTreeBare.empty()
    const publicTree = await PublicTree.fromCID(cid, null)
    const prettyTree = await PublicTreeBare.fromCID(cid)

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTree.empty(key)

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
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
    window.removeEventListener('online', this.whenOnline)
  }



  // POSIX INTERFACE
  // ---------------

  async ls(path: string): Promise<Links> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.ls(relPath)
    })
  }

  async mkdir(path: string): Promise<CID> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.mkdir(relPath)
    })
    return this.sync()
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

  async rm(path: string): Promise<CID> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.rm(relPath)
    })
    return this.sync()
  }

  async get(path: string): Promise<Tree | File | null> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.get(relPath)
    })
  }

  async mv(from: string, to: string): Promise<CID> {
    const node = await this.get(from)
    if (node === null) {
      throw new Error(`Path does not exist: ${from}`)
    }
    const toParts = pathUtil.splitParts(to)
    const destPath = pathUtil.join(toParts.slice(0, toParts.length - 1)) // remove file/dir name
    const destination = await this.get(destPath)
    if (check.isFile(destination)) {
      throw new Error(`Can not \`mv\` to a file: ${destPath}`)
    }
    await this.addChild(to, node)
    return this.rm(from)
  }



  // OTHER
  // -----

  /**
   * Retrieves all pins needed for private filesystem and adds them to the 'pin tree'
   */
  async updatePinTree(pins: PinMap): Promise<void> {
    // we pass `this.rootDid` as a salt
    const pinLinks = await pinMapToLinks('private', pins, this.rootDid)
    this.pinsTree = BareTree.fromLinks(pinLinks)
    await this.root.addChild('pins', this.pinsTree)
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
  async addChild(path: string, toAdd: Tree | FileContent): Promise<CID> {
    await this.runOnTree(path, true, (tree, relPath) => {
      return tree.addChild(relPath, toAdd)
    })
    return this.sync()
  }

  /** @internal */
  async runOnTree<a>(
    path: string,
    updateTree: boolean, // ie. do a mutation
    fn: (tree: Tree, relPath: string) => Promise<a>
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
        await this.root.addChild('public', this.publicTree)
        await this.root.addChild('pretty', this.prettyTree)
      }

    } else if (head === 'private') {
      result = await fn(this.privateTree, relPath)

      if (updateTree && PrivateTree.instanceOf(result)) {
        this.privateTree = result
        const { pins } = await this.privateTree.putWithPins()
        await this.updatePinTree(pins)
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
