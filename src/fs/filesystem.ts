import PublicTreeBare, { constructors as PublicTreeBareConstructors } from './bare/tree'
import PublicTree, { constructors as PublicTreeConstructors } from './v1/PublicTree'
import PrivateTree, { constructors as PrivateTreeConstructors } from './v1/PrivateTree'
import { SimpleTree, Tree, SimpleFile, Links, SyncHook, FileSystemOptions } from './types'
import { CID, FileContent } from '../ipfs'
import { dataRoot } from '../data-root'

import * as keystore from '../keystore'
import pathUtil from './path'
import semver from './semver'
import { asyncWaterfall } from '../common/util'


type ConstructorParams = {
  root: SimpleTree
  publicTree: PublicTree
  prettyTree: PublicTreeBare
  privateTree: PrivateTree
}


export class FileSystem {

  root: SimpleTree
  publicTree: PublicTree
  prettyTree: PublicTreeBare
  privateTree: PrivateTree
  syncHooks: Array<SyncHook>

  constructor({ root, publicTree, prettyTree, privateTree }: ConstructorParams) {
    this.root = root
    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateTree = privateTree
    this.syncHooks = []
  }

  static async empty(opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { keyName = 'filesystem-root', version = semver.latest } = opts

    const root = await PublicTreeBareConstructors.empty()
    const publicTree = await PublicTreeConstructors.empty()
    const prettyTree = await PublicTreeBareConstructors.empty()

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTreeConstructors.empty(key)

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
    })
  }

  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const { keyName = 'filesystem-root' } = opts

    const root = await PublicTreeBareConstructors.fromCID(cid)
    const publicCID = root.findLinkCID('public')
    const publicTree = publicCID !== null 
                        ? await PublicTreeConstructors.fromCID(publicCID)
                        : null

    const prettyTree = (await root.getDirectChild('pretty')) as PublicTreeBare ||
                        await PublicTreeBareConstructors.empty()

    const privateCID = root.findLinkCID('private')
    const key = await keystore.getKeyByName(keyName)
    const privateTree = privateCID !== null 
                          ? await PrivateTreeConstructors.fromCID(privateCID, key) 
                          : null

    if (publicTree === null || privateTree === null) return null

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
    })
  }

  static async forUser(username: string, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const cid = await dataRoot(username)
    return FileSystem.fromCID(cid, opts)
  }

  /**
   * Upgrade public IPFS folder to FileSystem
   */
  static async upgradePublicCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { keyName = 'filesystem-root', version = semver.latest } = opts

    const root = await PublicTreeBareConstructors.empty()
    const publicTree = await PublicTreeConstructors.fromCID(cid)
    const prettyTree = await PublicTreeBareConstructors.fromCID(cid)

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTreeConstructors.empty(key)

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
    })
  }

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

  async get(path: string): Promise<SimpleTree | SimpleFile | null> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.get(relPath)
    })
  }

  async pinList(): Promise<CID[]> {
    const privateResult = await this.privateTree.putWithPins()
    const publicResult = await this.publicTree.putWithPins()
    const rootCID = await this.sync()
    return [
      ...privateResult.pins,
      ...publicResult.pins,
      rootCID
    ]
  }

  async sync(): Promise<CID> {
    this.root = await asyncWaterfall(this.root, [
      (t: SimpleTree) => t.addChild('public', this.publicTree),
      (t: SimpleTree) => t.addChild('pretty', this.prettyTree),
      (t: SimpleTree) => t.addChild('private', this.privateTree)
    ])

    const cid = await this.root.put()

    this.syncHooks.forEach(hook => {
      hook(cid)
    })

    return cid
  }

  addSyncHook(hook: SyncHook): Array<SyncHook> {
    this.syncHooks = [...this.syncHooks, hook]
    return this.syncHooks
  }

  removeSyncHook(hook: SyncHook): Array<SyncHook> {
    this.syncHooks = this.syncHooks.filter(h => h !== hook)
    return this.syncHooks
  }

  async runOnTree<a>(
    path: string,
    updateTree: boolean, // ie. do a mutation
    fn: (tree: SimpleTree, relPath: string) => Promise<a>
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
        this.prettyTree = resultPretty as unknown as PublicTreeBare
      }

    } else if (head === 'private') {
      result = await fn(this.privateTree, relPath)

      if (updateTree && PrivateTree.instanceOf(result)) {
        this.privateTree = result
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
}


export default FileSystem
