import PublicTreeBare, { constructors as PublicTreeBareConstructors } from './public/tree'
import PublicTree, { constructors as PublicTreeConstructors } from './public/tree'
import PrivateTree, { constructors as PrivateTreeConstructors } from './private/tree'
import { SimpleTree, Tree, SimpleFile, Links, SyncHook, FileSystemOptions } from './types'
import { CID, FileContent } from '../ipfs'
import pathUtil from './path'
import semver from './semver'
import keystore from '../keystore'
import user from '../user'
import { asyncWaterfall } from '../common/util'


type ConstructorParams = {
  root: Tree
  publicTree: PublicTree
  prettyTree: PublicTreeBare
  privateTree: PrivateTree
}


export class FileSystem {

  root: Tree
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

    const root = await PublicTreeConstructors.empty(semver.v0)
    const publicTree = await PublicTreeConstructors.empty(version)
    const prettyTree = await PublicTreeBareConstructors.empty(semver.v0)

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTreeConstructors.empty(version, key)

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
    })
  }

  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const { keyName = 'filesystem-root' } = opts

    const root = await PublicTreeConstructors.fromCID(cid)
    const publicTree = (await root.getDirectChild('public')) as PublicTree
    const prettyTree = (await root.getDirectChild('pretty')) as PublicTree ||
                        await PublicTreeConstructors.empty(semver.v0)

    const privLink = root.findLink('private')
    const key = await keystore.getKeyByName(keyName)
    const privateTree = privLink ? await PrivateTreeConstructors.fromCID(privLink.cid, key) : null

    if (publicTree === null || privateTree === null) return null

    return new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
    })
  }

  static async forUser(username: string, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const cid = await user.fileRoot(username)
    return FileSystem.fromCID(cid, opts)
  }

  /**
   * Upgrade public IPFS folder to FileSystem
   */
  static async upgradePublicCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { keyName = 'filesystem-root', version = semver.latest } = opts

    const root = await PublicTreeConstructors.empty(semver.v0)
    const publicTree = await PublicTreeConstructors.fromCID(cid)
    const prettyTree = await PublicTreeConstructors.fromCID(cid)

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTreeConstructors.empty(version, key)

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

  // async pinList(): Promise<CID[]> {
  //   const rootCID = await this.sync()
  //   return this.privateTree.pinList().concat([ rootCID ])
  // }

  async sync(): Promise<CID> {
    this.root = await asyncWaterfall(this.root,[
      (t: Tree) => t.addChild('public', this.publicTree),
      (t: Tree) => t.addChild('pretty', this.prettyTree),
      (t: Tree) => t.addChild('private', this.privateTree)
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
        this.prettyTree = resultPretty as unknown as PublicTree
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
