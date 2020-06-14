import BareTree from './bare/tree'
import PublicTree from './v1/PublicTree'
import PrivateTree from './v1/PrivateTree'
import { File, Tree, Links, SyncHook, FileSystemOptions, HeaderTree, PinMap } from './types'
import { isString } from '../common/type-checks'
import { CID, FileContent } from '../ipfs'
import { dataRoot } from '../data-root'

import * as keystore from '../keystore'
import * as pathUtil from './path'
import { pinMapToLinks } from './pins'
import * as core from '../core'


type ConstructorParams = {
  root: Tree
  publicTree: HeaderTree
  prettyTree: BareTree
  privateTree: HeaderTree
  pinsTree: BareTree
  keyTree: HeaderTree
  key: string
  rootDID: string
}


export class FileSystem {

  root: Tree
  publicTree: HeaderTree
  prettyTree: BareTree
  privateTree: HeaderTree
  pinsTree: BareTree
  keyTree: HeaderTree
  key: string
  rootDID: string
  syncHooks: Array<SyncHook>

  constructor({ root, publicTree, prettyTree, privateTree, pinsTree, keyTree, key, rootDID }: ConstructorParams) {
    this.root = root
    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateTree = privateTree
    this.pinsTree = pinsTree
    this.keyTree = keyTree
    this.key = key
    this.rootDID = rootDID
    this.syncHooks = []
  }

  static async empty(opts: FileSystemOptions = {}): Promise<FileSystem> {
    const { keyName = 'filesystem-root', rootDID = '' } = opts

    const root = await BareTree.empty()
    const publicTree = await PublicTree.empty(null)
    const prettyTree = await BareTree.empty()
    const pinsTree = await BareTree.empty()

    const key = await keystore.getKeyByName(keyName)
    const privateTree = await PrivateTree.empty(key)

    const keyTree = await PublicTree.empty(null)

    await root.addChild('public', publicTree)
    await root.addChild('pretty', prettyTree)
    await root.addChild('private', privateTree)
    await root.addChild('pins', pinsTree)
    await root.addChild('keys', keyTree)

    const fs = new FileSystem({
      root,
      publicTree,
      prettyTree,
      privateTree,
      pinsTree,
      keyTree,
      key,
      rootDID
    })

    // share filesystem wiht self
    // const did = await core.did.own() 
    // await fs.shareWith(did, )

    return fs
  }

  static async fromCID(cid: CID, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const { rootDID = '' } = opts

    const root = await BareTree.fromCID(cid)
    const publicCID = root.findLinkCID('public')
    const publicTree = publicCID !== null
      ? await PublicTree.fromCID(publicCID, null)
      : null

    const prettyTree = (await root.getDirectChild('pretty')) as BareTree ||
      await BareTree.empty()
    const pinsTree = (await root.getDirectChild('pins')) as BareTree ||
      await BareTree.empty()

    const keyCID = root.findLinkCID('keys')
    if(keyCID === null) return null
    const keyTree = await PublicTree.fromCID(keyCID, null) 

    // find root FS key by checking the /keys folder to see if current DID has access
    const did = await core.did.own()
    const ks = await keystore.get()
    const encryptedKey = await keyTree.cat(did)
    if(!isString(encryptedKey)) {
      throw new Error("Filesystem not shared with current user")
    }
    const key = await ks.decrypt(encryptedKey)

    const privateCID = root.findLinkCID('private')
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
      keyTree,
      key,
      rootDID
    })
  }

  static async forUser(username: string, opts: FileSystemOptions = {}): Promise<FileSystem | null> {
    const cid = await dataRoot(username)
    opts.rootDID = await core.did.root(username)
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
    this.pinsTree = BareTree.fromLinks(pinLinks)
    await this.root.addChild('pins', this.pinsTree)
  }

  async shareWith(username: string, path: string): Promise<CID> {
    if(!path.startsWith('private')) throw new Error('Can only share private folders.')
    const dids = await core.share.getDeviceKeys(username)
    const ks = await keystore.get()
    await Promise.all(
      dids.map(async (did) => {
        const pubkey = core.did.didToPubKey(did)
        const encryptedRootKey = await ks.encrypt(this.key, pubkey)
        await this.keyTree.add(did, encryptedRootKey)
      })
    )

    await this.root.addChild('keys', this.keyTree)
    return this.sync()
  }

  async put(): Promise<CID> {
    return this.root.put()
  }

  async sync(): Promise<CID> {
    const cid = await this.put()

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

    } else if (head === 'keys') {
      throw new Error("The keys path is read only. Add keys using with `shareWith`")

    } else {
      throw new Error("Not a valid FileSystem path")

    }

    return result
  }
}


export default FileSystem
