import * as Uint8arrays from "uint8arrays"

import * as Crypto from "../../components/crypto/implementation.js"
import * as Depot from "../../components/depot/implementation.js"
import * as History from "./PrivateHistory.js"
import * as Manners from "../../components/manners/implementation.js"
import * as Reference from "../../components/reference/implementation.js"
import * as Pathing from "../../path/index.js"

import BaseTree from "../base/tree.js"
import MMPT from "../protocol/private/mmpt.js"
import PrivateFile from "./PrivateFile.js"
import PrivateHistory from "./PrivateHistory.js"

import { DEFAULT_AES_ALG } from "../protocol/basic.js"
import { Links, SoftLink, UpdateCallback } from "../types.js"
import { DecryptedNode, PrivateSkeletonInfo, PrivateTreeInfo, PrivateAddResult, PrivateLink, PrivateSkeleton } from "../protocol/private/types.js"
import { Segments as Path } from "../../path/index.js"
import { PrivateName, BareNameFilter } from "../protocol/private/namefilter.js"
import { decodeCID, isObject, hasProp, mapObj, Maybe, removeKeyFromObj, encodeCID } from "../../common/index.js"

import * as check from "../protocol/private/types/check.js"
import * as checkNormie from "../types/check.js"
import * as metadata from "../metadata.js"
import * as namefilter from "../protocol/private/namefilter.js"
import * as protocol from "../protocol/index.js"
import * as versions from "../versions.js"


type ConstructorParams = {
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation

  header: PrivateTreeInfo
  key: Uint8Array
  mmpt: MMPT
}


export default class PrivateTree extends BaseTree {

  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation

  children: { [ name: string ]: PrivateTree | PrivateFile }
  header: PrivateTreeInfo
  history: PrivateHistory
  key: Uint8Array
  mmpt: MMPT

  constructor({ crypto, depot, manners, reference, mmpt, key, header }: ConstructorParams) {
    super()

    this.crypto = crypto
    this.depot = depot
    this.manners = manners
    this.reference = reference

    this.children = {}
    this.header = header
    this.key = key
    this.mmpt = mmpt

    this.history = new PrivateHistory(
      crypto,
      depot,
      toHistoryNode(this)
    )

    function toHistoryNode(tree: PrivateTree): History.Node {
      return {
        ...tree,
        fromInfo: async (mmpt: MMPT, key: Uint8Array, info: DecryptedNode) => toHistoryNode(
          await PrivateTree.fromInfo(crypto, depot, manners, reference, mmpt, key, info)
        )
      }
    }
  }

  static instanceOf(obj: unknown): obj is PrivateTree {
    return isObject(obj)
      && hasProp(obj, "mmpt")
      && hasProp(obj, "header")
      && check.isPrivateTreeInfo(obj.header)
  }

  static async create(
    crypto: Crypto.Implementation,
    depot: Depot.Implementation,
    manners: Manners.Implementation,
    reference: Reference.Implementation,
    mmpt: MMPT,
    key: Uint8Array,
    parentNameFilter: Maybe<BareNameFilter>
  ): Promise<PrivateTree> {
    const bareNameFilter = parentNameFilter
      ? await namefilter.addToBare(crypto, parentNameFilter, namefilter.legacyEncodingMistake(key, "base64pad"))
      : await namefilter.createBare(crypto, key)
    return new PrivateTree({
      crypto,
      depot,
      manners,
      reference,

      mmpt,
      key,
      header: {
        metadata: metadata.empty(false, versions.latest),
        bareNameFilter,
        revision: 1,
        links: {},
        skeleton: {},
      }
    })
  }

  static async fromBaseKey(
    crypto: Crypto.Implementation,
    depot: Depot.Implementation,
    manners: Manners.Implementation,
    reference: Reference.Implementation,
    mmpt: MMPT,
    key: Uint8Array
  ): Promise<PrivateTree> {
    const bareNameFilter = await namefilter.createBare(crypto, key)
    return this.fromBareNameFilter(crypto, depot, manners, reference, mmpt, bareNameFilter, key)
  }

  static async fromBareNameFilter(
    crypto: Crypto.Implementation,
    depot: Depot.Implementation,
    manners: Manners.Implementation,
    reference: Reference.Implementation,
    mmpt: MMPT,
    bareNameFilter: BareNameFilter,
    key: Uint8Array
  ): Promise<PrivateTree> {
    const info = await protocol.priv.getLatestByBareNameFilter(depot, crypto, mmpt, bareNameFilter, key)
    return this.fromInfo(crypto, depot, manners, reference, mmpt, key, info)
  }

  static async fromLatestName(
    crypto: Crypto.Implementation,
    depot: Depot.Implementation,
    manners: Manners.Implementation,
    reference: Reference.Implementation,
    mmpt: MMPT,
    name: PrivateName,
    key: Uint8Array
  ): Promise<PrivateTree> {
    const info = await protocol.priv.getLatestByName(depot, crypto, mmpt, name, key)
    return this.fromInfo(crypto, depot, manners, reference, mmpt, key, info)
  }

  static async fromName(
    crypto: Crypto.Implementation,
    depot: Depot.Implementation,
    manners: Manners.Implementation,
    reference: Reference.Implementation,
    mmpt: MMPT,
    name: PrivateName,
    key: Uint8Array
  ): Promise<PrivateTree> {
    const info = await protocol.priv.getByName(depot, crypto, mmpt, name, key)
    return this.fromInfo(crypto, depot, manners, reference, mmpt, key, info)
  }

  static async fromInfo(
    crypto: Crypto.Implementation,
    depot: Depot.Implementation,
    manners: Manners.Implementation,
    reference: Reference.Implementation,
    mmpt: MMPT,
    key: Uint8Array,
    info: Maybe<DecryptedNode>
  ): Promise<PrivateTree> {
    if (!check.isPrivateTreeInfo(info)) {
      throw new Error(`Could not parse a valid private tree using the given key`)
    }

    return new PrivateTree({ crypto, depot, manners, reference, mmpt, key, header: info })
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<PrivateTree> {
    const key = await this.crypto.aes.genKey(DEFAULT_AES_ALG).then(this.crypto.aes.exportKey)
    const child = await PrivateTree.create(this.crypto, this.depot, this.manners, this.reference, this.mmpt, key, this.header.bareNameFilter)

    const existing = this.children[ name ]
    if (existing) {
      if (PrivateFile.instanceOf(existing)) {
        throw new Error(`There is a file at the given path: ${name}`)
      }
      return existing
    }

    await this.updateDirectChild(child, name, onUpdate)
    return child
  }

  async createOrUpdateChildFile(content: Uint8Array, name: string, onUpdate: Maybe<UpdateCallback>): Promise<PrivateFile> {
    const existing = await this.getDirectChild(name)

    let file: PrivateFile
    if (existing === null) {
      const key = await this.crypto.aes.genKey(DEFAULT_AES_ALG).then(this.crypto.aes.exportKey)
      file = await PrivateFile.create(this.crypto, this.depot, this.mmpt, content, this.header.bareNameFilter, key)
    } else if (PrivateFile.instanceOf(existing)) {
      file = await existing.updateContent(content)
    } else {
      throw new Error(`There is already a directory with that name: ${name}`)
    }
    await this.updateDirectChild(file, name, onUpdate)
    return file
  }

  async putDetailed(): Promise<PrivateAddResult> {
    // copy the object, so we're putting the current version & don't include any revisions
    const nodeCopy = Object.assign({}, this.header)

    // ensure all CIDs in skeleton are in string form, not sure where these CID objects are coming from
    nodeCopy.skeleton = ensureSkeletonStringCIDs(nodeCopy.skeleton)

    return protocol.priv.addNode(this.depot, this.crypto, this.mmpt, nodeCopy, this.key)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    if (this.readOnly) throw new Error("Tree is read-only")
    await child.updateParentNameFilter(this.header.bareNameFilter)
    this.children[ name ] = child
    const details = await child.putDetailed()
    this.updateLink(name, details)
    onUpdate && await onUpdate()
    return this
  }

  removeDirectChild(name: string): this {
    this.header = {
      ...this.header,
      revision: this.header.revision + 1,
      links: removeKeyFromObj(this.header.links, name),
      skeleton: removeKeyFromObj(this.header.skeleton, name)
    }
    if (this.children[ name ]) {
      delete this.children[ name ]
    }
    return this
  }

  async getDirectChild(name: string): Promise<PrivateTree | PrivateFile | null> {
    let child = null

    if (this.children[ name ]) {
      return this.children[ name ]
    }

    const childInfo = this.header.links[ name ]
    if (childInfo === undefined) return null

    // Hard link
    if (check.isPrivateLink(childInfo)) {
      const key = Uint8arrays.fromString(childInfo.key, "base64pad")

      child = childInfo.isFile
        ? await PrivateFile.fromLatestName(this.crypto, this.depot, this.mmpt, childInfo.pointer, key)
        : await PrivateTree.fromLatestName(this.crypto, this.depot, this.manners, this.reference, this.mmpt, childInfo.pointer, key)

      // Soft link
    } else if (checkNormie.isSoftLink(childInfo)) {
      return PrivateTree.resolveSoftLink(this.crypto, this.depot, this.manners, this.reference, childInfo)

    }

    // Check that the child wasn't added while retrieving the content from the network
    if (this.children[ name ]) {
      return this.children[ name ]
    }

    if (child) this.children[ name ] = child
    return child
  }

  async getName(): Promise<PrivateName> {
    const { bareNameFilter, revision } = this.header
    const revisionFilter = await namefilter.addRevision(this.crypto, bareNameFilter, this.key, revision)
    return namefilter.toPrivateName(this.crypto, revisionFilter)
  }

  async updateParentNameFilter(parentNameFilter: BareNameFilter): Promise<this> {
    this.header.bareNameFilter = await namefilter.addToBare(this.crypto, parentNameFilter, namefilter.legacyEncodingMistake(this.key, "base64pad"))
    return this
  }

  async get(path: Path): Promise<PrivateTree | PrivateFile | null> {
    if (path.length === 0) return this

    const [ head, ...rest ] = path

    const next = this.header.skeleton[ head ]
    if (next === undefined) return null

    return this.getRecurse(next, rest)
  }

  async getRecurse(
    nodeInfo: PrivateSkeletonInfo | SoftLink,
    parts: string[]
  ): Promise<PrivateTree | PrivateFile | null> {
    const [ head, ...rest ] = parts

    if (checkNormie.isSoftLink(nodeInfo)) {
      const resolved = await PrivateTree.resolveSoftLink(this.crypto, this.depot, this.manners, this.reference, nodeInfo)

      if (!resolved) return null
      if (head === undefined) return resolved

      if (PrivateTree.instanceOf(resolved)) {
        return resolved.get(parts).then(makeReadOnly)
      }

      throw new Error("Was expecting a directory at: " + Pathing.log(parts))
    }

    if (head === undefined) return getNode(this.crypto, this.depot, this.manners, this.reference, this.mmpt, nodeInfo)

    const nextChild = nodeInfo.subSkeleton[ head ]
    if (nextChild !== undefined) return this.getRecurse(nextChild, rest)

    const reloadedNode = await protocol.priv.getLatestByCID(
      this.depot,
      this.crypto,
      this.mmpt,
      decodeCID(nodeInfo.cid),
      Uint8arrays.fromString(nodeInfo.key, "base64pad")
    )
    if (!check.isPrivateTreeInfo(reloadedNode)) return null

    const reloadedNext = reloadedNode.skeleton[ head ]
    return reloadedNext === undefined ? null : this.getRecurse(reloadedNext, rest)
  }


  // Links
  // -----

  assignLink({ name, link, skeleton }: {
    name: string
    link: PrivateLink | SoftLink
    skeleton: PrivateSkeletonInfo | SoftLink
  }): void {
    this.header.links[ name ] = link
    this.header.skeleton[ name ] = skeleton
    this.header.revision = this.header.revision + 1
    this.header.metadata.unixMeta.mtime = Date.now()
  }

  static async resolveSoftLink(
    crypto: Crypto.Implementation,
    depot: Depot.Implementation,
    manners: Manners.Implementation,
    reference: Reference.Implementation,
    link: SoftLink
  ): Promise<PrivateTree | PrivateFile | null> {
    const domain = link.ipns.split("/")[ 0 ]

    if (!link.privateName || !link.key) throw new Error("Mixing public and private soft links is not supported yet.")

    const rootCid = await reference.dns.lookupDnsLink(domain)
    if (!rootCid) throw new Error(`Failed to resolve the soft link: ${link.ipns} - Could not resolve DNSLink`)

    const privateCid = (await protocol.basic.getSimpleLinks(depot, decodeCID(rootCid))).private.cid
    const mmpt = await MMPT.fromCID(depot, decodeCID(privateCid))
    const key = Uint8arrays.fromString(link.key, "base64pad")

    const info = await protocol.priv.getLatestByName(
      depot,
      crypto,
      mmpt,
      link.privateName as PrivateName,
      key
    )

    if (!info) return null

    const item = info.metadata.isFile
      ? await PrivateFile.fromInfo(crypto, depot, mmpt, key, info)
      : await PrivateTree.fromInfo(crypto, depot, manners, reference, mmpt, key, info)

    if (item) item.readOnly = true
    return item
  }

  getLinks(): Links {
    return mapObj(this.header.links, (link) => {
      if (checkNormie.isSoftLink(link)) {
        return { ...link }
      } else {
        const { key, ...rest } = link
        return { ...rest }
      }
    })
  }

  updateLink(name: string, result: PrivateAddResult): this {
    const { cid, size, isFile, skeleton } = result
    const key = Uint8arrays.toString(result.key, "base64pad")
    const pointer = result.name
    this.assignLink({
      name,
      link: { name, key, pointer, size, isFile: isFile },
      skeleton: { cid: encodeCID(cid), key, subSkeleton: skeleton }
    })
    return this
  }

  insertSoftLink({ name, key, privateName, username }: { name: string; key: Uint8Array; privateName: PrivateName; username: string }): this {
    const softLink = {
      ipns: this.reference.dataRoot.domain(username),
      name,
      privateName,
      key: Uint8arrays.toString(key, "base64pad")
    }
    this.assignLink({
      name,
      link: softLink,
      skeleton: softLink
    })
    return this
  }

}



// 🛠


async function getNode(
  crypto: Crypto.Implementation,
  depot: Depot.Implementation,
  manners: Manners.Implementation,
  reference: Reference.Implementation,
  mmpt: MMPT,
  nodeInfo: PrivateSkeletonInfo
): Promise<PrivateFile | PrivateTree | null> {
  const key = Uint8arrays.fromString(nodeInfo.key, "base64pad")
  const node = await protocol.priv.getLatestByCID(
    depot,
    crypto,
    mmpt,
    decodeCID(nodeInfo.cid),
    key
  )

  return check.isPrivateFileInfo(node)
    ? await PrivateFile.fromInfo(crypto, depot, mmpt, key, node)
    : await PrivateTree.fromInfo(crypto, depot, manners, reference, mmpt, key, node)
}


function ensureSkeletonStringCIDs(skeleton: PrivateSkeleton): PrivateSkeleton {
  return Object.entries(skeleton).reduce(
    (acc, [ k, skeletonOrSoftLink ]) => {
      let newValue = skeletonOrSoftLink

      if (check.isPrivateSkeletonInfo(skeletonOrSoftLink)) {
        skeletonOrSoftLink.cid = decodeCID(skeletonOrSoftLink.cid).toString()
        skeletonOrSoftLink.subSkeleton = ensureSkeletonStringCIDs(skeletonOrSoftLink.subSkeleton)
      }

      return { ...acc, [ k ]: newValue }
    },
    {}
  )
}


function makeReadOnly(
  maybeFileOrTree: PrivateFile | PrivateTree | null
): PrivateFile | PrivateTree | null {
  if (maybeFileOrTree) maybeFileOrTree.readOnly = true
  return maybeFileOrTree
}
