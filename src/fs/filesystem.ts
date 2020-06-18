import BareTree from './bare/tree'
import PublicTree from './v1/PublicTree'
import PrivateTree from './v1/PrivateTree'
import { File, Tree, Links, SyncHook, FileSystemOptions, HeaderTree, PinMap } from './types'
import { CID, FileContent } from '../ipfs'
import { dataRoot } from '../data-root'

import * as keystore from '../keystore'
import * as pathUtil from './path'
import { pinMapToLinks } from './pins'
import * as did from '../core/did'


type ConstructorParams = {
  root: Tree
  publicTree: HeaderTree
  prettyTree: BareTree
  privateTree: HeaderTree
  pinTree: BareTree
  rootDID: string
}


export class FileSystem {

  root: Tree
  publicTree: HeaderTree
  prettyTree: BareTree
  privateTree: HeaderTree
  pinTree: BareTree
  rootDID: string
  syncHooks: Array<SyncHook>

  constructor({ root, publicTree, prettyTree, privateTree, pinTree, rootDID }: ConstructorParams) {
    this.root = root
    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateTree = privateTree
    this.pinTree = pinTree
    this.rootDID = rootDID
    this.syncHooks = []
  }

  static async empty(opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { keyName = 'filesystem-root', rootDID = '' } = opts

    const root = await BareTree.empty()
    const publicTree = await PublicTree.empty(null)
    const prettyTree = await BareTree.empty()
    const pinTree = await BareTree.empty()

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTree.empty(key)

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
      pinTree,
      rootDID
    })
  }

  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const { keyName = 'filesystem-root', rootDID = '' } = opts

    const root = await BareTree.fromCID(cid)
    const publicCID = root.findLinkCID('public')
    const publicTree = publicCID !== null
      ? await PublicTree.fromCID(publicCID, null)
      : null

    const prettyTree = (await root.getDirectChild('pretty')) as BareTree ||
      await BareTree.empty()
    const pinTree = (await root.getDirectChild('pins')) as BareTree ||
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
      pinTree,
      rootDID
    })
  }

  static async forUser(username: string, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const cid = await dataRoot(username)
    opts.rootDID = await did.rootDIDForUser(username)
    return FileSystem.fromCID(cid, opts)
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

  async get(path: string): Promise<Tree | File | null> {
    return this.runOnTree(path, false, (tree, relPath) => {
      return tree.get(relPath)
    })
  }

  async updatePinTree(pins: PinMap): Promise<void> {
    // we pass `this.rootDID` as a salt
    const pinLinks = await pinMapToLinks('private', pins, this.rootDID)
    this.pinTree = BareTree.fromLinks(pinLinks)
    await this.root.addChild('pins', this.pinTree)
  }

  async sync(): Promise<CID> {
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
}


export default FileSystem
