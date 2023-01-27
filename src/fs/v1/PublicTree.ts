import { CID } from "multiformats/cid"

import * as Common from "../../common/index.js"
import * as Check from "../types/check.js"
import * as Depot from "../../components/depot/implementation.js"
import * as History from "./PublicHistory.js"
import * as LinkMod from "../link.js"
import * as Metadata from "../metadata.js"
import * as Path from "../../path/index.js"
import * as Protocol from "../protocol/index.js"
import * as Reference from "../../components/reference/implementation.js"
import * as Versions from "../versions.js"

import { Link, Links, NonEmptyPath, SoftLink, UpdateCallback } from "../types.js"
import { Maybe } from "../../common/index.js"
import { DistinctivePath } from "../../path/index.js"
import { Skeleton, SkeletonInfo, TreeInfo, TreeHeader, PutDetails } from "../protocol/public/types.js"
import { decodeCID, encodeCID } from "../../common/cid.js"
import { nextNonEmpty } from "../protocol/public/skeleton.js"

import BaseTree from "../base/tree.js"
import BareTree from "../bare/tree.js"
import PublicFile from "./PublicFile.js"
import PublicHistory from "./PublicHistory.js"


type ConstructorParams = {
  depot: Depot.Implementation
  reference: Reference.Implementation

  cid: Maybe<CID>
  links: Links
  header: TreeHeader
}

type Child =
  PublicFile | PublicTree | BareTree


export class PublicTree extends BaseTree {

  depot: Depot.Implementation
  reference: Reference.Implementation

  children: { [ name: string ]: Child }
  cid: Maybe<CID>
  links: Links
  header: TreeHeader
  history: PublicHistory

  constructor({ depot, reference, links, header, cid }: ConstructorParams) {
    super()

    this.depot = depot
    this.reference = reference

    this.children = {}
    this.cid = cid
    this.links = links
    this.header = header
    this.history = new PublicHistory(
      toHistoryNode(this)
    )

    function toHistoryNode(tree: PublicTree): History.Node {
      return {
        ...tree,
        fromCID: async (cid: CID) => toHistoryNode(
          await PublicTree.fromCID(depot, reference, cid)
        )
      }
    }
  }

  static async empty(depot: Depot.Implementation, reference: Reference.Implementation): Promise<PublicTree> {
    return new PublicTree({
      depot,
      reference,

      links: {},
      header: {
        metadata: Metadata.empty(false, Versions.latest),
        skeleton: {},
      },
      cid: null
    })
  }

  static async fromCID(depot: Depot.Implementation, reference: Reference.Implementation, cid: CID): Promise<PublicTree> {
    const info = await Protocol.pub.get(depot, cid)
    if (!Check.isTreeInfo(info)) {
      throw new Error(`Could not parse a valid public tree at: ${cid}`)
    }
    return PublicTree.fromInfo(depot, reference, info, cid)
  }

  static async fromInfo(depot: Depot.Implementation, reference: Reference.Implementation, info: TreeInfo, cid: CID): Promise<PublicTree> {
    const { userland, metadata, previous, skeleton } = info
    const links = await Protocol.basic.getFileSystemLinks(depot, decodeCID(userland))
    return new PublicTree({
      depot,
      reference,

      links,
      header: { metadata, previous, skeleton },
      cid
    })
  }

  static instanceOf(obj: unknown): obj is PublicTree {
    return Common.hasProp(obj, "links")
      && Common.hasProp(obj, "header")
      && Check.isLinks(obj.links)
      && Check.isTreeHeader(obj.header)
  }

  async createChildTree(name: string, onUpdate: Maybe<UpdateCallback>): Promise<PublicTree> {
    const child = await PublicTree.empty(this.depot, this.reference)

    const existing = this.children[ name ]
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

  async createOrUpdateChildFile(content: Uint8Array, name: string, onUpdate: Maybe<UpdateCallback>): Promise<PublicFile> {
    const existing = await this.getDirectChild(name)
    let file: PublicFile
    if (existing === null) {
      file = await PublicFile.create(this.depot, content)
    } else if (PublicFile.instanceOf(existing)) {
      file = await existing.updateContent(content)
    } else {
      throw new Error(`There is already a directory with that name: ${name}`)
    }
    await this.updateDirectChild(file, name, onUpdate)
    return file
  }

  async putDetailed(): Promise<PutDetails> {
    const details = await Protocol.pub.putTree(
      this.depot,
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
    this.children[ name ] = child
    const details = await child.putDetailed()
    this.updateLink(name, details)
    onUpdate && await onUpdate()
    return this
  }

  removeDirectChild(name: string): this {
    delete this.links[ name ]
    delete this.header.skeleton[ name ]
    if (this.children[ name ]) {
      delete this.children[ name ]
    }
    return this
  }

  async getDirectChild(name: string): Promise<Child | null> {
    let child = null

    if (this.children[ name ]) {
      return this.children[ name ]
    }

    const childInfo = this.header.skeleton[ name ] || null
    if (childInfo === null) return null

    // Hard link
    if (Check.isSkeletonInfo(childInfo)) {
      const cid = decodeCID(childInfo.cid)
      child = childInfo.isFile
        ? await PublicFile.fromCID(this.depot, cid)
        : await PublicTree.fromCID(this.depot, this.reference, cid)

      // Soft link
    } else if (Check.isSoftLink(childInfo)) {
      return PublicTree.resolveSoftLink(this.depot, this.reference, childInfo)

    }

    // Check that the child wasn't added while retrieving the content from the network
    if (this.children[ name ]) {
      return this.children[ name ]
    }

    if (child) this.children[ name ] = child
    return child
  }

  async get(path: Path.Segments): Promise<Child | null> {
    if (path.length < 1) return this

    const res = await this.getRecurse(this.header.skeleton, path as NonEmptyPath)

    // Hard link
    if (Check.isSkeletonInfo(res)) {
      const cid = decodeCID(res.cid)
      const info = await Protocol.pub.get(this.depot, cid)
      return Check.isFileInfo(info)
        ? PublicFile.fromInfo(this.depot, info, cid)
        : PublicTree.fromInfo(this.depot, this.reference, info, cid)
    }

    // Child
    return res as Child
  }

  async getRecurse(skel: Skeleton, path: NonEmptyPath): Promise<SkeletonInfo | Child | null> {
    const head = path[ 0 ]
    const child = skel[ head ] || null
    const nextPath = nextNonEmpty(path)

    if (Check.isSoftLink(child)) {
      const resolved = await PublicTree.resolveSoftLink(this.depot, this.reference, child)
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
    name: string
    link: Link
    skeleton: SkeletonInfo | SoftLink
  }): void {
    this.links[ name ] = link
    this.header.skeleton[ name ] = skeleton
    this.header.metadata.unixMeta.mtime = Date.now()
  }

  static async resolveSoftLink(
    depot: Depot.Implementation,
    reference: Reference.Implementation,
    link: SoftLink
  ): Promise<Child | null> {
    const [ domain, ...pieces ] = link.ipns.split("/")
    const path = Path.fromPosix(pieces.join("/"))
    const isPublic =
      Path.isOnRootBranch(Path.RootBranch.Public, path) ||
      Path.isOnRootBranch(Path.RootBranch.Pretty, path)

    if (!isPublic) throw new Error("Mixing public and private soft links is not supported yet.")

    const rootCid = await reference.dns.lookupDnsLink(domain)
    if (!rootCid) throw new Error(`Failed to resolve the soft link: ${link.ipns} - Could not resolve DNSLink`)

    const publicCid = (await Protocol.basic.getSimpleLinks(depot, decodeCID(rootCid))).public.cid
    const publicPath = Path.removePartition(path)
    const publicTree = await PublicTree.fromCID(depot, reference, decodeCID(publicCid))

    const item = await publicTree.get(Path.unwrap(publicPath))
    if (item) item.readOnly = true
    return item
  }

  getLinks(): Links {
    // add missing metadata into links
    return Object.values(this.links).reduce((acc, cur) => {
      const s = this.header.skeleton[ cur.name ]

      return {
        ...acc,
        [ cur.name ]: s && (s as SkeletonInfo).isFile !== undefined
          ? { ...cur, isFile: (s as SkeletonInfo).isFile }
          : { ...cur },
      }
    }, {} as Links)
  }

  updateLink(name: string, result: PutDetails): this {
    const { cid, metadata, userland, size, isFile, skeleton } = result
    this.assignLink({
      name,
      link: LinkMod.make(name, cid, false, size),
      skeleton: {
        cid: encodeCID(cid),
        metadata,
        userland,
        subSkeleton: skeleton,
        isFile
      }
    })
    return this
  }

  insertSoftLink({ name, path, username }: { name: string; path: DistinctivePath<Path.Segments>; username: string }): this {
    const softLink = {
      ipns: this.reference.dataRoot.domain(username) + `/public/${Path.toPosix(path)}`,
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
