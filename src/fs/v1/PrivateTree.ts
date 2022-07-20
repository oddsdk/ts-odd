import BaseTree from "../base/tree.js"
import MMPT from "../protocol/private/mmpt.js"
import PrivateFile from "./PrivateFile.js"
import PrivateHistory from "./PrivateHistory.js"

import { Links, SoftLink, UpdateCallback } from "../types.js"
import { DecryptedNode, PrivateSkeletonInfo, PrivateTreeInfo, PrivateAddResult, PrivateLink } from "../protocol/private/types.js"
import { FileContent } from "../../ipfs/index.js"
import { Path } from "../../path.js"
import { PrivateName, BareNameFilter } from "../protocol/private/namefilter.js"
import { decodeCID, isObject, hasProp, mapObj, Maybe, removeKeyFromObj } from "../../common/index.js"
import { setup } from "../../setup/internal.js"

import * as check from "../protocol/private/types/check.js"
import * as checkNormie from "../types/check.js"
import * as cidLog from "../../common/cid-log.js"
import * as common from "../../common/index.js"
import * as crypto from "../../crypto/index.js"
import * as dns from "../../dns/index.js"
import * as history from "./PrivateHistory.js"
import * as metadata from "../metadata.js"
import * as namefilter from "../protocol/private/namefilter.js"
import * as pathing from "../../path.js"
import * as protocol from "../protocol/index.js"
import * as versions from "../versions.js"


type ConstructorParams = {
  header: PrivateTreeInfo
  key: string
  mmpt: MMPT
}


export default class PrivateTree extends BaseTree {

  children: { [name: string]: PrivateTree | PrivateFile }
  header: PrivateTreeInfo
  history: PrivateHistory
  key: string
  mmpt: MMPT

  constructor({ mmpt, key, header }: ConstructorParams) {
    super()

    this.children = {}
    this.header = header
    this.history = new PrivateHistory(this as unknown as history.Node)
    this.key = key
    this.mmpt = mmpt
  }

  static instanceOf(obj: unknown): obj is PrivateTree {
    return isObject(obj)
      && hasProp(obj, "mmpt")
      && hasProp(obj, "header")
      && check.isPrivateTreeInfo(obj.header)
  }

  static async create(mmpt: MMPT, key: string, parentNameFilter: Maybe<BareNameFilter>): Promise<PrivateTree> {
    const bareNameFilter = parentNameFilter
      ? await namefilter.addToBare(parentNameFilter, key)
      : await namefilter.createBare(key)
    return new PrivateTree({
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

  static async fromBaseKey(mmpt: MMPT, key: string): Promise<PrivateTree> {
    const bareNameFilter = await namefilter.createBare(key)
    return this.fromBareNameFilter(mmpt, bareNameFilter, key)
  }

  static async fromBareNameFilter(mmpt: MMPT, bareNameFilter: BareNameFilter, key: string): Promise<PrivateTree> {
    const info = await protocol.priv.getLatestByBareNameFilter(mmpt, bareNameFilter, key)
    return this.fromInfo(mmpt, key, info)
  }

  static async fromLatestName(mmpt: MMPT, name: PrivateName, key: string): Promise<PrivateTree> {
    const info = await protocol.priv.getLatestByName(mmpt, name, key)
    return this.fromInfo(mmpt, key, info)
  }

  static async fromName(mmpt: MMPT, name: PrivateName, key: string): Promise<PrivateTree> {
    const info = await protocol.priv.getByName(mmpt, name, key)
    return this.fromInfo(mmpt, key, info)
  }

  static async fromInfo(mmpt: MMPT, key: string, info: Maybe<DecryptedNode>): Promise<PrivateTree> {
    if (!check.isPrivateTreeInfo(info)) {
      throw new Error(`Could not parse a valid private tree using the given key`)
    }

    return new PrivateTree({ mmpt, key, header: info })
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<PrivateTree> {
    const key = await crypto.aes.genKeyStr()
    const child = await PrivateTree.create(this.mmpt, key, this.header.bareNameFilter)

    const existing = this.children[name]
    if (existing) {
      if (PrivateFile.instanceOf(existing)) {
        throw new Error(`There is a file at the given path: ${name}`)
      }
      return existing
    }

    await this.updateDirectChild(child, name, onUpdate)
    return child
  }

  async createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<PrivateFile>{
    const existing = await this.getDirectChild(name)

    let file: PrivateFile
    if (existing === null) {
      const key = await crypto.aes.genKeyStr()
      file = await PrivateFile.create(this.mmpt, content, this.header.bareNameFilter, key)
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
    return protocol.priv.addNode(this.mmpt, nodeCopy, this.key)
  }

  async updateDirectChild(child: PrivateTree | PrivateFile, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    if (this.readOnly) throw new Error("Tree is read-only")
    await child.updateParentNameFilter(this.header.bareNameFilter)
    this.children[name] = child
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
    if(this.children[name]) {
      delete this.children[name]
    }
    return this
  }

  async getDirectChild(name: string): Promise<PrivateTree | PrivateFile | null> {
    let child = null

    if (this.children[name]) {
      return this.children[name]
    }

    const childInfo = this.header.links[name]
    if (childInfo === undefined) return null

    // Hard link
    if (check.isPrivateLink(childInfo)) {
      child = childInfo.isFile
        ? await PrivateFile.fromLatestName(this.mmpt, childInfo.pointer, childInfo.key)
        : await PrivateTree.fromLatestName(this.mmpt, childInfo.pointer, childInfo.key)

    // Soft link
    } else if (checkNormie.isSoftLink(childInfo)) {
      return PrivateTree.resolveSoftLink(childInfo)

    }

    // Check that the child wasn't added while retrieving the content from the network
    if (this.children[name]) {
      return this.children[name]
    }

    if (child) this.children[name] = child
    return child
  }

  async getName(): Promise<PrivateName> {
    const { bareNameFilter, revision } = this.header
    const revisionFilter = await namefilter.addRevision(bareNameFilter, this.key, revision)
    return namefilter.toPrivateName(revisionFilter)
  }

  async updateParentNameFilter(parentNameFilter: BareNameFilter): Promise<this> {
    this.header.bareNameFilter = await namefilter.addToBare(parentNameFilter, this.key)
    return this
  }

  async get(path: Path): Promise<PrivateTree | PrivateFile | null> {
    if (path.length === 0) return this

    const [head, ...rest] = path

    const next = this.header.skeleton[head]
    if (next === undefined) return null

    return this.getRecurse(next, rest)
  }

  async getRecurse(
    nodeInfo: PrivateSkeletonInfo | SoftLink,
    parts: string[]
  ): Promise<PrivateTree | PrivateFile | null> {
    const [head, ...rest] = parts

    if (checkNormie.isSoftLink(nodeInfo)) {
      const resolved = await PrivateTree.resolveSoftLink(nodeInfo)

      if (!resolved) return null
      if (head === undefined) return resolved

      if (PrivateTree.instanceOf(resolved)) {
        return resolved.get(parts).then(makeReadOnly)
      }

      throw new Error("Was expecting a directory at: " + pathing.log(parts))
    }

    if (head === undefined) return getNode(this.mmpt, nodeInfo)

    const nextChild = nodeInfo.subSkeleton[head]
    if (nextChild !== undefined) return this.getRecurse(nextChild, rest)

    const reloadedNode = await protocol.priv.getLatestByCID(
      this.mmpt,
      decodeCID(nodeInfo.cid),
      nodeInfo.key
    )
    if (!check.isPrivateTreeInfo(reloadedNode)) return null

    const reloadedNext = reloadedNode.skeleton[head]
    return reloadedNext === undefined ? null : this.getRecurse(reloadedNext, rest)
  }


  // Links
  // -----

  assignLink({ name, link, skeleton }: {
    name: string,
    link: PrivateLink | SoftLink,
    skeleton: PrivateSkeletonInfo | SoftLink
  }): void {
    this.header.links[name] = link
    this.header.skeleton[name] = skeleton
    this.header.revision = this.header.revision + 1
    this.header.metadata.unixMeta.mtime = Date.now()
  }

  static async resolveSoftLink(link: SoftLink): Promise<PrivateTree | PrivateFile | null> {
    const domain = link.ipns.split("/")[0]

    if (!link.privateName || !link.key) throw new Error("Mixing public and private soft links is not supported yet.")

    const rootCid = domain === await common.authenticatedUserDomain({ withFiles: true })
      ? await cidLog.newest()
      : await dns.lookupDnsLink(domain)
    if (!rootCid) throw new Error(`Failed to resolve the soft link: ${link.ipns} - Could not resolve DNSLink`)

    const privateCid = (await protocol.basic.getSimpleLinks(decodeCID(rootCid))).private.cid
    const mmpt = await MMPT.fromCID(decodeCID(privateCid))

    const info = await protocol.priv.getLatestByName(
      mmpt,
      link.privateName as PrivateName,
      link.key
    )

    if (!info) return null

    const item = info.metadata.isFile
      ? await PrivateFile.fromInfo(mmpt, link.key, info)
      : await PrivateTree.fromInfo(mmpt, link.key, info)

    if (item) item.readOnly = true
    return item
  }

  getLinks(): Links {
    return mapObj(this.header.links, (link) => {
      if (checkNormie.isSoftLink(link)) {
        return { ...link }
      } else {
        const { key, ...rest } = link
        return { ...rest  }
      }
    })
  }

  updateLink(name: string, result: PrivateAddResult): this {
    const { cid, size, key, isFile, skeleton } = result
    const pointer = result.name
    this.assignLink({
      name,
      link: { name, key, pointer, size, isFile: isFile },
      skeleton: { cid, key, subSkeleton: skeleton }
    })
    return this
  }

  insertSoftLink({ name, username, key, privateName }: { name: string, username: string, key: string, privateName: PrivateName }): this {
    const softLink = {
      ipns: `${username}.files.${setup.endpoints.user}`,
      name,
      privateName,
      key
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
  mmpt: MMPT,
  nodeInfo: PrivateSkeletonInfo
): Promise<PrivateFile | PrivateTree | null> {
  const node = await protocol.priv.getLatestByCID(
    mmpt,
    decodeCID(nodeInfo.cid),
    nodeInfo.key
  )

  return check.isPrivateFileInfo(node)
    ? await PrivateFile.fromInfo(mmpt, nodeInfo.key, node)
    : await PrivateTree.fromInfo(mmpt, nodeInfo.key, node)
}


function makeReadOnly(
  maybeFileOrTree: PrivateFile | PrivateTree | null
): PrivateFile | PrivateTree | null {
  if (maybeFileOrTree) maybeFileOrTree.readOnly = true
  return maybeFileOrTree
}
