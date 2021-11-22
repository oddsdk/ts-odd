import * as uint8arrays from "uint8arrays"
import { CID as CIDObj } from "multiformats"

import { AddResult, CID, get as getIPFS } from "../../ipfs/index.js"
import { BareNameFilter } from "../protocol/private/namefilter.js"
import { Links, Puttable } from "../types.js"
import { Branch, DistinctivePath } from "../../path.js"
import { Maybe } from "../../common/index.js"
import { Permissions } from "../../ucan/permissions.js"

import * as crypto from "../../crypto/index.js"
import * as identifiers from "../../common/identifiers.js"
import * as link from "../link.js"
import * as pathing from "../../path.js"
import * as protocol from "../protocol/index.js"
import * as versions from "../versions.js"
import * as storage from "../../storage/index.js"
import * as ucanPermissions from "../../ucan/permissions.js"

import * as namefilter from "../data/private/namefilter.js"

import { BlockStore, createIPFSBlockStore } from "../data/blockStore.js"
import * as privateStore from "../data/private/privateStore.js"
import * as privateNode from "../data/private/privateNode.js"
import * as publicNode from "../data/public/publicNode.js"
import { HAMTPrivateStore } from "../data/private/privateStore.js"
import { RatchetStore, PrivateNode } from "../data/private/privateNode.js"
import { isSpiralRatchet, SpiralRatchet, toKey } from "../data/private/spiralratchet.js"
import { PublicDirectory } from "../data/public/publicNode.js"
import { setup } from "../../index.js"


export default class RootTree implements Puttable {

  links: Links
  blockStore: BlockStore
  privateStore: HAMTPrivateStore
  ratchetStore: RatchetStore
  publicRootDirectory: PublicDirectory
  privateNodes: Record<string, PrivateNode>

  constructor({ links, blockStore, privateStore, ratchetStore, publicRootDirectory, privateNodes }: {
    links: Links
    blockStore: BlockStore
    privateStore: HAMTPrivateStore
    ratchetStore: RatchetStore
    publicRootDirectory: PublicDirectory
    privateNodes: Record<string, PrivateNode>
  }) {
    this.links = links
    this.blockStore = blockStore
    this.privateStore = privateStore
    this.ratchetStore = ratchetStore
    this.publicRootDirectory = publicRootDirectory
    this.privateNodes = privateNodes
  }


  // INITIALISATION
  // --------------

  static async empty({ rootKey }: { rootKey: string }): Promise<RootTree> {
    // common for both public and private
    const now = Date.now()
    const blockStore = createIPFSBlockStore(await getIPFS())
    
    // public
    const publicRootDirectory = await publicNode.newDirectory(now)

    // private
    const privStore = privateStore.create(privateStore.createHAMT(blockStore), blockStore)
    const ratchetStore = new BasicRatchetStore()
    const privateRootDirectory = await privateNode.newDirectory(namefilter.empty(), {
      ...privStore,
      ...ratchetStore.asStore(),
      now,
      ratchetDisparityBudget: () => setup.ratchetDisparityBudget(),
    })
    await ratchetStore.storeRatchet(privateRootDirectory.bareName, privateRootDirectory.revision)

    // Store root key
    await RootTree.storeRootKey(rootKey)

    const privateRootPath = pathing.toPosix(pathing.directory(pathing.Branch.Private))

    // Fin
    return new RootTree({
      links: {},
      blockStore,
      privateStore: privStore,
      ratchetStore,
      publicRootDirectory,
      privateNodes: { [privateRootPath]: privateRootDirectory}
    })
  }

  static async fromCID(
    { cid, permissions }: { cid: CID; permissions?: Permissions }
  ): Promise<RootTree> {
    const now = Date.now()
    const blockStore = createIPFSBlockStore(await getIPFS())
    const links = await protocol.basic.getLinks(cid)

    const keys = permissions ? await permissionKeys(permissions) : []
    const ratchetStore = permissions != null
      ? await BasicRatchetStore.fromPrivatePathKeys(keys)
      : new BasicRatchetStore()

    // Load public parts
    const publicCID = links[Branch.Public]?.cid || null
    const publicRootDirectory = publicCID === null
      ? await publicNode.newDirectory(now)
      : await publicNode.load(CIDObj.parse(publicCID), blockStore)

    if (publicNode.isPublicFile(publicRootDirectory)) {
      throw new Error(`Expected public root directory, but got a file at ${publicCID}`)
    }

    // Load private bits
    const privateCID = links[Branch.Private]?.cid || null

    const hamt = privateCID == null
      ? await privateStore.createHAMT(blockStore)
      : await privateStore.loadHAMT(CIDObj.parse(privateCID), blockStore)
    const privStore = privateStore.create(hamt, blockStore)
    const privateCtx = {
      ...privStore,
      ...ratchetStore.asStore(),
      ratchetDisparityBudget: () => setup.ratchetDisparityBudget()
    }
    const privateNodes = privateCID == null ? {} : loadPrivateNodes(keys, privateCtx)

    // Construct tree
    const tree = new RootTree({
      links,
      blockStore,
      privateStore: privStore,
      ratchetStore,
      publicRootDirectory,
      privateNodes
    })

    if (links[Branch.Version] == null) {
      // Old versions of WNFS didn't write a root version link
      await tree.setVersion(versions.latest)
    }

    // Fin
    return tree
  }

  // MUTATIONS
  // ---------

  async put(): Promise<CID> {
    const { cid } = await this.putDetailed()
    return cid
  }

  async putDetailed(): Promise<AddResult> {
    const hamt = await this.privateStore.getHAMTSnapshot()
    const hamtCID = CIDObj.asCID(hamt.id)
    if (hamtCID == null) {
      throw new Error(`Couldn't store HAMT. Expected to have a CID, but got ${hamt.id}`)
    }
    const publicCID = await publicNode.store(this.publicRootDirectory, this.blockStore)
    return protocol.basic.putLinks({
      ...this.links,
      private: {
        name: "private",
        isFile: false,
        size: 0,
        cid: hamtCID.toString(),
      },
      public: {
        name: "public",
        isFile: false,
        size: 0,
        cid: publicCID.toString()
      }
    })
  }

  updateLink(name: string, result: AddResult): this {
    const { cid, size, isFile } = result
    this.links[name] = link.make(name, cid, isFile, size)
    return this
  }

  async updatePuttable(name: string, puttable: Puttable): Promise<this> {
    return this.updateLink(name, await puttable.putDetailed())
  }


  // PRIVATE TREES
  // -------------

  static async storeRootKey(rootKey: string): Promise<void> {
    const path = pathing.directory(pathing.Branch.Private)
    const rootKeyId = await identifiers.readKey({ path })
    await crypto.keystore.importSymmKey(rootKey, rootKeyId)
  }

  findPrivateNode(path: DistinctivePath): [DistinctivePath, PrivateNode | null] {
    return findPrivateNode(this.privateNodes, path)
  }


  // VERSION
  // -------

  async setVersion(v: versions.SemVer): Promise<this> {
    const result = await protocol.basic.putFile(versions.toString(v))
    return this.updateLink(Branch.Version, result)
  }

  async getVersion(): Promise<versions.SemVer | null> {
    const file = await protocol.basic.getFile(this.links[Branch.Version].cid)
    return versions.fromString(uint8arrays.toString(file))
  }

}



// ㊙️


type PrivatePathKey = {
  path: DistinctivePath
  ratchet: SpiralRatchet
  bareName: Uint8Array
}

function findPrivateNode(
  map: Record<string, PrivateNode>,
  path: DistinctivePath
): [DistinctivePath, PrivateNode | null] {
  const t = map[pathing.toPosix(path)]
  if (t) return [ path, t ]

  const parent = pathing.parent(path)

  return parent
    ? findPrivateNode(map, parent)
    : [ path, null ]
}

async function loadPrivateNodes(
  pathKeys: PrivatePathKey[],
  ctx: privateNode.PrivateOperationContext
): Promise<Record<string, PrivateNode>> {
  const privateNodes: Record<string, PrivateNode> = {}
  for (const entry of pathKeys) {
    const key = await toKey(entry.ratchet)
    const fullName = await namefilter.addToBare(entry.bareName, key)
    const saturatedName = await namefilter.saturate(fullName)
    const privateRef = { key, namefilter: saturatedName }
    privateNodes[pathing.toPosix(entry.path)] = await privateNode.loadNode(privateRef, ctx)
  }
  return privateNodes
}

async function permissionKeys(
  permissions: Permissions
): Promise<PrivatePathKey[]> {
  const pathKeys: PrivatePathKey[] = []
  for (const path of ucanPermissions.paths(permissions)) {
    if (pathing.isBranch(pathing.Branch.Public, path)) continue

    const bareName = await loadBareName({ path })
    const ratchet = await loadRatchet({ path, bareName })
    pathKeys.push({ path, bareName, ratchet })
  }
  return sortedPrivatePathKeys(pathKeys)
}

/**
 * Sort keys alphabetically by path.
 * This is used to sort paths by parent first.
 */
function sortedPrivatePathKeys(list: PrivatePathKey[]): PrivatePathKey[] {
  return list.sort(
    (a, b) => pathing.toPosix(a.path).localeCompare(pathing.toPosix(b.path))
  )
}

async function loadBareName({ path }: { path: DistinctivePath }): Promise<namefilter.Namefilter> {
  // Get the bare name filter
  const bareNameId = await identifiers.bareNameFilter({ path })
  const bareName = await storage.getItem(bareNameId)
  if (bareName == null) {
    throw new Error(`Can't get permission for path ${pathing.toPosix(path)}: Missing bare namefilter`)
  }
  if (!(bareName instanceof Uint8Array)) {
    throw new Error(`Can't get permission for path ${pathing.toPosix(path)}: Can't decode bare name. Expected Uint8Array. Got ${typeof bareName}.`)
  }
  return bareName
}

async function loadRatchet({ path, bareName }: { path: DistinctivePath; bareName: namefilter.Namefilter }): Promise<SpiralRatchet> {
  const ratchetId = await identifiers.ratchet({ bareName })
  const ratchet: SpiralRatchet | null = await storage.getItem(ratchetId)
  if (ratchet == null) {
    throw new Error(`Can't get permission for path ${pathing.toPosix(path)}: Missing ratchet.`)
  }
  if (!isSpiralRatchet(ratchet)) {
    throw new Error(`Can't get permission for path ${pathing.toPosix(path)}: Expected ratchet, but got ${JSON.stringify(ratchet)}`)
  }
  return ratchet
}

class BasicRatchetStore implements RatchetStore {

  static async fromPrivatePathKeys(privateAccesses: PrivatePathKey[]): Promise<BasicRatchetStore> {
    const ratchetStore = new BasicRatchetStore()
    for (const entry of privateAccesses) {
      await ratchetStore.storeRatchet(entry.bareName, entry.ratchet)
    }
    return ratchetStore
  }

  async storeRatchet(bareName: Uint8Array, ratchet: SpiralRatchet): Promise<void> {
    await storage.setItem(await identifiers.ratchet({ bareName }), ratchet)
  }
  
  async getOldestKnownRatchet(bareName: Uint8Array): Promise<SpiralRatchet> {
    const ratchet = await storage.getItem<unknown>(await identifiers.ratchet({ bareName }))
    if (ratchet == null) {
      throw new Error(`Missing spiral ratchet for bare namefilter ${uint8arrays.toString(bareName, "base64pad")}`)
    }
    if (!isSpiralRatchet(ratchet)) {
      throw new Error(`Stored corrupted spiral ratchet at namefilter ${uint8arrays.toString(bareName, "base64pad")}: ${JSON.stringify(ratchet)}`)
    }
    return ratchet
  }

  asStore(): RatchetStore {
    return this
  }

}
