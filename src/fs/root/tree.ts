import * as cbor from "@ipld/dag-cbor"
import * as uint8arrays from "uint8arrays"
import { CID } from "multiformats/cid"

import { AddResult } from "../../ipfs/index.js"
import { BareNameFilter } from "../protocol/private/namefilter.js"
import { Puttable, SimpleLink, SimpleLinks, UnixTree } from "../types.js"
import { Branch, DistinctivePath } from "../../path.js"
import { Maybe, decodeCID } from "../../common/index.js"
import { Permissions } from "../../ucan/permissions.js"
import { get as getIpfs } from "../../ipfs/config.js"

import * as crypto from "../../crypto/index.js"
import * as identifiers from "../../common/identifiers.js"
import * as link from "../link.js"
import * as ipfs from "../../ipfs/index.js"
import * as pathing from "../../path.js"
import * as protocol from "../protocol/index.js"
import * as storage from "../../storage/index.js"
import * as typeChecks from "../../common/type-checks.js"
import * as ucanPermissions from "../../ucan/permissions.js"
import * as versions from "../versions.js"
import * as debug from "../../common/debug.js"

import BareTree from "../bare/tree.js"
import MMPT from "../protocol/private/mmpt.js"
import PublicTree from "../v1/PublicTree.js"
import PrivateTree from "../v1/PrivateTree.js"
import PrivateFile from "../v1/PrivateFile.js"
import { PublicRootWasm } from "../v3/PublicRootWasm.js"


type PrivateNode = PrivateTree | PrivateFile


export default class RootTree implements Puttable {

  links: SimpleLinks
  mmpt: MMPT
  privateLog: Array<SimpleLink>

  sharedCounter: number
  sharedLinks: SimpleLinks

  publicTree: UnixTree & Puttable
  prettyTree: BareTree
  privateNodes: Record<string, PrivateNode>

  constructor({ links, mmpt, privateLog, sharedCounter, sharedLinks, publicTree, prettyTree, privateNodes }: {
    links: SimpleLinks
    mmpt: MMPT
    privateLog: Array<SimpleLink>

    sharedCounter: number
    sharedLinks: SimpleLinks

    publicTree: UnixTree & Puttable
    prettyTree: BareTree
    privateNodes: Record<string, PrivateNode>
  }) {
    this.links = links
    this.mmpt = mmpt
    this.privateLog = privateLog

    this.sharedCounter = sharedCounter
    this.sharedLinks = sharedLinks

    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateNodes = privateNodes
  }


  // INITIALISATION
  // --------------

  static async empty({ rootKey, wnfsWasm }: { rootKey: string; wnfsWasm?: boolean }): Promise<RootTree> {
    if (wnfsWasm) {
      debug.log(`⚠️ Running an EXPERIMENTAL new version of the file system: 3.0.0`)
    }
  
    const publicTree = wnfsWasm
      ? await PublicRootWasm.empty(await getIpfs())
      : await PublicTree.empty()

    const prettyTree = await BareTree.empty()
    const mmpt = MMPT.create()

    // Private tree
    const rootPath = pathing.toPosix(pathing.directory(pathing.Branch.Private))
    const rootTree = await PrivateTree.create(mmpt, rootKey, null)
    await rootTree.put()

    // Construct tree
    const tree = new RootTree({
      links: {},
      mmpt,
      privateLog: [],

      sharedCounter: 1,
      sharedLinks: {},

      publicTree,
      prettyTree,
      privateNodes: {
        [rootPath]: rootTree
      }
    })

    // Store root key
    await RootTree.storeRootKey(rootKey)

    // Set version and store new sub trees
    await tree.setVersion(wnfsWasm ? versions.wnfsWasm : versions.latest)

    await Promise.all([
      tree.updatePuttable(Branch.Public, publicTree),
      tree.updatePuttable(Branch.Pretty, prettyTree),
      tree.updatePuttable(Branch.Private, mmpt)
    ])

    // Fin
    return tree
  }

  static async fromCID(
    { cid, permissions }: { cid: CID; permissions?: Permissions }
  ): Promise<RootTree> {
    const links = await protocol.basic.getSimpleLinks(cid)
    const keys = permissions ? await permissionKeys(permissions) : []

    const version = await parseVersionFromLinks(links)
    const wnfsWasm = versions.equals(version, versions.wnfsWasm)

    if (wnfsWasm) {
      debug.log(`⚠️ Running an EXPERIMENTAL new version of the file system: 3.0.0`)
    }

    // Load public parts
    const publicCID = links[Branch.Public]?.cid || null
    const publicTree = publicCID === null
      ? await PublicTree.empty()
      : wnfsWasm
        ? await PublicRootWasm.fromCID(await getIpfs(), decodeCID(publicCID))
        : await PublicTree.fromCID(decodeCID(publicCID))


    const prettyTree = links[Branch.Pretty]
                         ? await BareTree.fromCID(decodeCID(links[Branch.Pretty].cid))
                         : await BareTree.empty()

    // Load private bits
    const privateCID = links[Branch.Private]?.cid || null

    let mmpt, privateNodes
    if (privateCID === null) {
      mmpt = MMPT.create()
      privateNodes = {}
    } else {
      mmpt = await MMPT.fromCID(decodeCID(privateCID))
      privateNodes = await loadPrivateNodes(keys, mmpt)
    }

    const privateLogCid = links[Branch.PrivateLog]?.cid
    const privateLog = privateLogCid
      ? await ipfs.dagGet(decodeCID(privateLogCid))
          .then(dagNode => dagNode.Links.map(link.fromDAGLink))
          .then(links => links.sort((a, b) => {
            return parseInt(a.name, 10) - parseInt(b.name, 10)
          }))
      : []

    // Shared
    const sharedCid = links[Branch.Shared]?.cid || null
    const sharedLinks = sharedCid
      ? await this.getSharedLinks(decodeCID(sharedCid))
      : {}

    const sharedCounterCid = links[Branch.SharedCounter]?.cid || null
    const sharedCounter = sharedCounterCid
      ? await protocol.basic
        .getFile(decodeCID(sharedCounterCid))
        .then(a => JSON.parse(uint8arrays.toString(a, "utf8")))
      : 1

    // Construct tree
    const tree = new RootTree({
      links,
      mmpt,
      privateLog,

      sharedCounter,
      sharedLinks,

      publicTree,
      prettyTree,
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
    return protocol.basic.putLinks(this.links)
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

  static async retrieveRootKey(): Promise<string> {
    const path = pathing.directory(pathing.Branch.Private)
    const rootKeyId = await identifiers.readKey({ path })
    return await crypto.keystore.exportSymmKey(rootKeyId)
  }

  findPrivateNode(path: DistinctivePath): [DistinctivePath, PrivateNode | null] {
    return findPrivateNode(this.privateNodes, path)
  }


  // PRIVATE LOG
  // -----------
  // CBOR array containing chunks.
  //
  // Chunk size is based on the default IPFS block size,
  // which is 1024 * 256 bytes. 1 log chunk should fit in 1 block.
  // We'll use the CSV format for the data in the chunks.
  static LOG_CHUNK_SIZE = 1020 // Math.floor((1024 * 256) / (256 + 1))


  async addPrivateLogEntry(cid: CID): Promise<void> {
    const log = [...this.privateLog]
    let idx = Math.max(0, log.length - 1)

    // get last chunk
    let lastChunk = log[idx]?.cid
      ? (await ipfs.cat(decodeCID(log[idx].cid))).split(",")
      : []

    // needs new chunk
    const needsNewChunk = lastChunk.length + 1 > RootTree.LOG_CHUNK_SIZE
    if (needsNewChunk) {
      idx = idx + 1
      lastChunk = []
    }

    // add to chunk
    const hashedCid = await crypto.hash.sha256Str(cid.toString())
    const updatedChunk = [...lastChunk, hashedCid]
    const updatedChunkDeposit = await protocol.basic.putFile(
      updatedChunk.join(",")
    )

    log[idx] = {
      name: idx.toString(),
      cid: updatedChunkDeposit.cid,
      size: updatedChunkDeposit.size
    }

    // save log
    const logDeposit = await ipfs.dagPutLinks(
      log.map(link.toDAGLink)
    )

    this.updateLink(Branch.PrivateLog, {
      cid: logDeposit.cid,
      isFile: false,
      size: await ipfs.size(logDeposit.cid)
    })

    this.privateLog = log
  }


  // SHARING
  // -------

  async addShares(links: SimpleLink[]): Promise<this> {
    this.sharedLinks = links.reduce(
      (acc, link) => ({ ...acc, [link.name]: link }),
      this.sharedLinks
    )

    const cborApprovedLinks = Object.values(this.sharedLinks).reduce(
      (acc, { cid, name, size }) => ({ ...acc,
        [name]: { cid, name, size }
      }),
      {}
    )

    const ipfsClient = await getIpfs()
    const cid = await ipfsClient.block.put(
      cbor.encode(cborApprovedLinks),
      { format: cbor.name, mhtype: "sha2-256", pin: false, version: 1 }
    )

    this.updateLink(Branch.Shared, {
      cid: cid,
      isFile: false,
      size: await ipfs.size(cid)
    })

    return this
  }

  static async getSharedLinks(cid: CID): Promise<SimpleLinks> {
    const ipfsClient = await getIpfs()
    const block = await ipfsClient.block.get(cid)
    const decodedBlock = cbor.decode(block)

    if (!typeChecks.isObject(decodedBlock)) throw new Error("Invalid shared section, not an object")

    return Object.values(decodedBlock).reduce(
      (acc: SimpleLinks, link: unknown): SimpleLinks => {
        if (!typeChecks.isObject(link)) return acc

        const name = link.name ? link.name as string : null
        const cid = link.cid
          ? decodeCID(link.cid as any)
          : null

        if (!name || !cid) return acc
        return { ...acc, [name]: { name, cid, size: (link.size || 0) as number } }
      },
      {}
    )
  }

  async setSharedCounter(counter: number): Promise<number> {
    this.sharedCounter = counter

    const { cid, size } = await protocol.basic.putFile(
      JSON.stringify(counter)
    )

    this.updateLink(Branch.SharedCounter, {
      cid: cid,
      isFile: true,
      size: size
    })

    return counter
  }

  async bumpSharedCounter(): Promise<number> {
    const newCounter = this.sharedCounter + 1
    return this.setSharedCounter(newCounter)
  }


  // VERSION
  // -------

  async setVersion(v: versions.SemVer): Promise<this> {
    const result = await protocol.basic.putFile(versions.toString(v))
    return this.updateLink(Branch.Version, result)
  }

  async getVersion(): Promise<versions.SemVer | null> {
    return await parseVersionFromLinks(this.links)
  }

}

async function parseVersionFromLinks(links: SimpleLinks): Promise<versions.SemVer> {
  const file = await protocol.basic.getFile(decodeCID(links[Branch.Version].cid))
  return versions.fromString(uint8arrays.toString(file)) ?? versions.v0
}



// ㊙️


type PathKey = { path: DistinctivePath; key: string }


async function findBareNameFilter(
  map: Record<string, PrivateNode>,
  path: DistinctivePath
): Promise<Maybe<BareNameFilter>> {
  const bareNameFilterId = await identifiers.bareNameFilter({ path })
  const bareNameFilter: Maybe<BareNameFilter> = await storage.getItem(bareNameFilterId)
  if (bareNameFilter) return bareNameFilter

  const [nodePath, node] = findPrivateNode(map, path)
  if (!node) return null

  const unwrappedPath = pathing.unwrap(path)
  const relativePath = unwrappedPath.slice(pathing.unwrap(nodePath).length)

  if (PrivateFile.instanceOf(node)) {
    return relativePath.length === 0 ? node.header.bareNameFilter : null
  }

  if (!node.exists(relativePath)) {
    if (pathing.isDirectory(path)) await node.mkdir(relativePath)
    else await node.add(relativePath, "")
  }

  return node.get(relativePath).then(t => t ? t.header.bareNameFilter : null)
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

function loadPrivateNodes(
  pathKeys: PathKey[],
  mmpt: MMPT
): Promise<Record<string, PrivateNode>> {
  return sortedPathKeys(pathKeys).reduce((acc, { path, key }) => {
    return acc.then(async map => {
      let privateNode

      const unwrappedPath = pathing.unwrap(path)

      // if root, no need for bare name filter
      if (unwrappedPath.length === 1 && unwrappedPath[0] === pathing.Branch.Private) {
        privateNode = await PrivateTree.fromBaseKey(mmpt, key)

      } else {
        const bareNameFilter = await findBareNameFilter(map, path)
        if (!bareNameFilter) throw new Error(`Was trying to load the PrivateTree for the path \`${path}\`, but couldn't find the bare name filter for it.`)
        if (pathing.isDirectory(path)) {
          privateNode = await PrivateTree.fromBareNameFilter(mmpt, bareNameFilter, key)
        } else {
          privateNode = await PrivateFile.fromBareNameFilter(mmpt, bareNameFilter, key)
        }
      }

      const posixPath = pathing.toPosix(path)
      return { ...map, [posixPath]: privateNode }
    })
  }, Promise.resolve({}))
}

async function permissionKeys(
  permissions: Permissions
): Promise<PathKey[]> {
  return ucanPermissions.paths(permissions).reduce(async (
    acc: Promise<PathKey[]>,
    path: DistinctivePath
  ): Promise<PathKey[]> => {
    if (pathing.isBranch(pathing.Branch.Public, path)) return acc

    const name = await identifiers.readKey({ path })
    const key = await crypto.keystore.exportSymmKey(name)
    const pk: PathKey = { path: path, key: key }

    return acc.then(
      list => [ ...list, pk ]
    )
  }, Promise.resolve(
    []
  ))
}

/**
 * Sort keys alphabetically by path.
 * This is used to sort paths by parent first.
 */
function sortedPathKeys(list: PathKey[]): PathKey[] {
  return list.sort(
    (a, b) => pathing.toPosix(a.path).localeCompare(pathing.toPosix(b.path))
  )
}
