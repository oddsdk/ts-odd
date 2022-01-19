import { CID } from "multiformats/cid"

import { FileContent } from "../../ipfs/index.js"
import { Links, NonEmptyPath, SoftLink, Link, UpdateCallback } from "../types.js"
import { Maybe } from "../../common/index.js"
import { DistinctivePath, Path } from "../../path.js"
import { Skeleton, SkeletonInfo, TreeInfo, TreeHeader, PutDetails } from "../protocol/public/types.js"
import { setup } from "../../setup/internal.js"

import BaseTree from "../base/tree.js"
import BareTree from "../bare/tree.js"
import PublicFile from "./PublicFile.js"
import PublicHistory from "./PublicHistory.js"

import * as cidLog from "../../common/cid-log.js"
import * as common from "../../common/index.js"
import * as dns from "../../dns/index.js"
import * as check from "../types/check.js"
import * as history from "./PublicHistory.js"
import * as link from "../link.js"
import * as metadata from "../metadata.js"
import * as pathing from "../../path.js"
import * as protocol from "../protocol/index.js"
import * as skeleton from "../protocol/public/skeleton.js"
import * as versions from "../versions.js"


type ConstructorParams = {
  cid: Maybe<CID>
  links: Links
  header: TreeHeader
}

type Child =
  PublicFile | PublicTree | BareTree


export class PublicTree extends BaseTree {

  children: { [name: string]: Child }
  cid: Maybe<CID>
  links: Links
  header: TreeHeader
  history: PublicHistory

  constructor({ links, header, cid }: ConstructorParams) {
    super()

    this.children = {}
    this.cid = cid
    this.links = links
    this.header = header
    this.history = new PublicHistory(this as unknown as history.Node)
  }

  static async empty (): Promise<PublicTree> {
    return new PublicTree({
      links: {},
      header: {
        metadata: metadata.empty(false, versions.latest),
        skeleton: {},
      },
      cid: null
    })
  }

  static async fromCID (cid: CID): Promise<PublicTree> {
    const info = await protocol.pub.get(cid)
    if(!check.isTreeInfo(info)) {
      throw new Error(`Could not parse a valid public tree at: ${cid}`)
    }
    return PublicTree.fromInfo(info, cid)
  }

  static async fromInfo(info: TreeInfo, cid: CID): Promise<PublicTree> {
    const { userland, metadata, previous, skeleton } = info
    const links = await protocol.basic.getFileSystemLinks(userland)
    return new PublicTree({
      links,
      header: { metadata, previous, skeleton },
      cid
    })
  }

  static instanceOf(obj: any): obj is PublicTree {
    return check.isLinks(obj.links) && check.isTreeHeader(obj.header)
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<PublicTree> {
    const child = await PublicTree.empty()

    const existing = this.children[name]
    if (existing) {
      if (PublicFile.instanceOf(existing)) {
        throw new Error(`There is a file at the given path: ${name}`)
      } else if (!PublicTree.instanceOf(existing)) {
        throw new Error(`Not a public tree at the given path: ${name}`)
      } else {
        return existing
      }
    }

    await this.updateDirectChild(child, name, onUpdate)
    return child
  }

  async createOrUpdateChildFile(content: FileContent, name: string, onUpdate: Maybe<UpdateCallback>): Promise<PublicFile> {
    const existing = await this.getDirectChild(name)
    let file: PublicFile
    if(existing === null){
      file = await PublicFile.create(content)
    } else if (PublicFile.instanceOf(existing)) {
      file = await existing.updateContent(content)
    }else {
      throw new Error(`There is already a directory with that name: ${name}`)
    }
    await this.updateDirectChild(file, name, onUpdate)
    return file
  }

  async putDetailed(): Promise<PutDetails> {
    const details = await protocol.pub.putTree(
      this.links,
      this.header.skeleton,
      this.header.metadata,
      this.cid
    )
    this.header.previous = this.cid || undefined
    this.cid = details.cid
    return details
  }

  async updateDirectChild(child: PublicTree | PublicFile, name: string, onUpdate: Maybe<UpdateCallback>): Promise<this> {
    if (this.readOnly) throw new Error("Tree is read-only")
    this.children[name] = child
    const details = await child.putDetailed()
    this.updateLink(name, details)
    onUpdate && await onUpdate()
    return this
  }

  removeDirectChild(name: string): this {
    delete this.links[name]
    delete this.header.skeleton[name]
    if(this.children[name]) {
      delete this.children[name]
    }
    return this
  }

  async getDirectChild(name: string): Promise<Child | null> {
    let child = null

    if (this.children[name]) {
      return this.children[name]
    }

    const childInfo = this.header.skeleton[name] || null
    if (childInfo === null) return null

    // Hard link
    if (check.isSkeletonInfo(childInfo)) {
      child = childInfo.isFile
        ? await PublicFile.fromCID(childInfo.cid)
        : await PublicTree.fromCID(childInfo.cid)

    // Soft link
    } else if (check.isSoftLink(childInfo)) {
      return PublicTree.resolveSoftLink(childInfo)

    }

    // Check that the child wasn't added while retrieving the content from the network
    if (this.children[name]) {
      return this.children[name]
    }

    if (child) this.children[name] = child
    return child
  }

  async get(path: Path): Promise<Child | null> {
    if (path.length < 1) return this

    const res = await this.getRecurse(this.header.skeleton, path as NonEmptyPath)

    // Hard link
    if (check.isSkeletonInfo(res)) {
      const info = await protocol.pub.get(res.cid)
      return check.isFileInfo(info)
        ? PublicFile.fromInfo(info, res.cid)
        : PublicTree.fromInfo(info, res.cid)
    }

    // Child
    return res as Child
  }

  async getRecurse(skel: Skeleton, path: NonEmptyPath): Promise<SkeletonInfo | Child | null> {
    const head = path[0]
    const child = skel[head] || null
    const nextPath = skeleton.nextNonEmpty(path)

    if (check.isSoftLink(child)) {
      const resolved = await PublicTree.resolveSoftLink(child)
      if (nextPath) {
        if (PublicTree.instanceOf(resolved)) {
          return resolved.get(nextPath).then(makeReadOnly)
        } else {
          return null
        }
      }
      return resolved
    } else if (child === null || nextPath === null) {
      return child
    } else if (child.subSkeleton) {
      return this.getRecurse(child.subSkeleton, nextPath)
    } else {
      return null
    }
  }


  // Links
  // -----

  assignLink({ name, link, skeleton }: {
    name: string,
    link: Link,
    skeleton: SkeletonInfo | SoftLink
  }): void {
    this.links[name] = link
    this.header.skeleton[name] = skeleton
    this.header.metadata.unixMeta.mtime = Date.now()
  }

  static async resolveSoftLink(link: SoftLink): Promise<Child | null> {
    const [domain, ...pieces] = link.ipns.split("/")
    const path = pathing.fromPosix(pieces.join("/"))
    const isPublic =
      pathing.isBranch(pathing.Branch.Public, path) ||
      pathing.isBranch(pathing.Branch.Pretty, path)

    if (!isPublic) throw new Error("Mixing public and private soft links is not supported yet.")

    const rootCid = domain === await common.authenticatedUserDomain({ withFiles: true })
      ? await cidLog.newest()
      : await dns.lookupDnsLink(domain)
    if (!rootCid) throw new Error(`Failed to resolve the soft link: ${link.ipns} - Could not resolve DNSLink`)

    const publicCid = (await protocol.basic.getSimpleLinks(CID.parse(rootCid))).public.cid
    const publicPath = pathing.removeBranch(path)
    const publicTree = await PublicTree.fromCID(publicCid)

    const item = await publicTree.get(pathing.unwrap(publicPath))
    if (item) item.readOnly = true
    return item
  }

  getLinks(): Links {
    // add missing metadata into links
    return Object.values(this.links).reduce((acc, cur) => {
      const s = this.header.skeleton[cur.name]

      return {
        ...acc,
        [cur.name]: s && (s as SkeletonInfo).isFile !== undefined
          ? { ...cur, isFile: (s as SkeletonInfo).isFile }
          : { ...cur },
      }
    }, {} as Links)
  }

  updateLink(name: string, result: PutDetails): this {
    const { cid, metadata, userland, size, isFile, skeleton } = result
    this.assignLink({
      name,
      link: link.make(name, cid, false, size),
      skeleton: {
        cid,
        metadata,
        userland,
        subSkeleton: skeleton,
        isFile
      }
    })
    return this
  }

  insertSoftLink({ name, path, username }: { name: string, path: DistinctivePath, username: string }): this {
    const softLink = {
      ipns: `${username}.files.${setup.endpoints.user}/public/${pathing.toPosix(path)}`,
      name
    }
    this.assignLink({
      name,
      link: softLink,
      skeleton: softLink
    })
    return this
  }
}


function makeReadOnly(
  maybeFileOrTree: Child | null
): Child | null {
  if (maybeFileOrTree) maybeFileOrTree.readOnly = true
  return maybeFileOrTree
}


export default PublicTree
