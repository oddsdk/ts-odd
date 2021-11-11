import * as uint8arrays from "uint8arrays"

import { AddResult, CID } from "../../ipfs/index.js"
import { BareNameFilter } from "../protocol/private/namefilter.js"
import { Links, Puttable, SimpleLink } from "../types.js"
import { Branch, DistinctivePath } from "../../path.js"
import { Maybe } from "../../common/index.js"
import { Permissions } from "../../ucan/permissions.js"

import * as crypto from "../../crypto/index.js"
import * as identifiers from "../../common/identifiers.js"
import * as ipfs from "../../ipfs/index.js"
import * as link from "../link.js"
import * as pathing from "../../path.js"
import * as protocol from "../protocol/index.js"
import * as versions from "../versions.js"
import * as storage from "../../storage/index.js"
import * as ucanPermissions from "../../ucan/permissions.js"

import BareTree from "../bare/tree.js"
import MMPT from "../protocol/private/mmpt.js"
import PublicTree from "../v1/PublicTree.js"
import PrivateTree from "../v1/PrivateTree.js"
import PrivateFile from "../v1/PrivateFile.js"


type PrivateNode = PrivateTree | PrivateFile


export default class RootTree implements Puttable {

  links: Links
  mmpt: MMPT

  publicTree: PublicTree
  prettyTree: BareTree
  privateNodes: Record<string, PrivateNode>

  constructor({ links, mmpt, publicTree, prettyTree, privateNodes }: {
    links: Links
    mmpt: MMPT

    publicTree: PublicTree
    prettyTree: BareTree
    privateNodes: Record<string, PrivateNode>
  }) {
    this.links = links
    this.mmpt = mmpt

    this.publicTree = publicTree
    this.prettyTree = prettyTree
    this.privateNodes = privateNodes
  }


  // INITIALISATION
  // --------------

  static async empty({ rootKey }: { rootKey: string }): Promise<RootTree> {
    const publicTree = await PublicTree.empty()
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

      publicTree,
      prettyTree,
      privateNodes: {
        [rootPath]: rootTree
      }
    })

    // Store root key
    await RootTree.storeRootKey(rootKey)

    // Set version and store new sub trees
    await tree.setVersion(versions.latest)

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
    const links = await protocol.basic.getLinks(cid)

    const keys = permissions ? await permissionKeys(permissions) : []

    // Load public parts
    const publicCID = links[Branch.Public]?.cid || null
    const publicTree = publicCID === null
      ? await PublicTree.empty()
      : await PublicTree.fromCID(publicCID)

    const prettyTree = links[Branch.Pretty]
                         ? await BareTree.fromCID(links[Branch.Pretty].cid)
                         : await BareTree.empty()

    // Load private bits
    const privateCID = links[Branch.Private]?.cid || null

    let mmpt, privateNodes
    if (privateCID === null) {
      mmpt = MMPT.create()
      privateNodes = {}
    } else {
      mmpt = await MMPT.fromCID(privateCID)
      privateNodes = await loadPrivateNodes(keys, mmpt)
    }

    // Construct tree
    const tree = new RootTree({
      links,
      mmpt,

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
