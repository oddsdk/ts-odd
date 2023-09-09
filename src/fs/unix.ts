import * as DagPB from "@ipld/dag-pb"
import { exporter } from "ipfs-unixfs-exporter"
import { importBytes as importer } from "ipfs-unixfs-importer"
import all from "it-all"
import * as Uint8arrays from "uint8arrays"

import * as Path from "../path/index.js"

import { PBLink, PBNode } from "@ipld/dag-pb"
import { UnixFS } from "ipfs-unixfs"

import { CID } from "../common/cid.js"
import * as Depot from "../components/depot/implementation.js"

/**
 * Create a UnixFS directory.
 */
export function createDirectory(currentTime: Date, links: PBLink[] = []): PBNode {
  const unixDir = new UnixFS({
    type: "directory",
    mtime: { secs: BigInt(Math.round(currentTime.getTime() / 1000)) },
  })

  return DagPB.createNode(unixDir.marshal(), links)
}

/**
 * Get the bytes of a UnixFS file.
 */
export async function exportFile(
  cid: CID,
  depot: Depot.Implementation,
  options?: { offset: number; length: number }
): Promise<Uint8Array> {
  const offset = options?.offset
  const length = options?.length

  const fsEntry = await exporter(cid, depot.blockstore)

  if (fsEntry.type === "file" || fsEntry.type === "raw") {
    return Uint8arrays.concat(
      await all(fsEntry.content({ offset, length }))
    )
  } else {
    throw new Error(`Expected a file, found a '${fsEntry.type}' (CID: ${cid.toString()})`)
  }
}

/**
 * Get the CID for some file bytes.
 */
export async function importFile(
  bytes: Uint8Array,
  depot: Depot.Implementation
): Promise<CID> {
  const { cid } = await importer(bytes, depot.blockstore)
  return cid
}

/**
 * Insert a node into UnixFS tree, creating directories when needed
 * and overwriting content.
 */
export async function insertNodeIntoTree(
  node: PBNode,
  path: Path.Distinctive<Path.Segments>,
  depot: Depot.Implementation,
  fileCID?: CID
): Promise<PBNode> {
  const pathKind = Path.kind(path)
  const pathParts = Path.unwrap(path)
  const name = pathParts[0]
  const link = node.Links.find(l => l.Name === name)

  // Directory
  // ---------
  if (Path.length(path) > 1) {
    let dirNode: PBNode

    if (link?.Hash) {
      dirNode = await load(link.Hash, depot)
    } else {
      dirNode = createDirectory(new Date())
    }

    const newDirNode = await insertNodeIntoTree(
      dirNode,
      Path.fromKind(pathKind, ...pathParts.slice(1)),
      depot,
      fileCID
    )

    const dirCID = await store(newDirNode, depot)
    const links = link
      ? replaceLinkHash(node.Links, name, dirCID)
      : addLink(node.Links, name, dirCID)

    return { ...node, Links: links }
  }

  // Last part of path
  // -----------------
  // Directory
  if (pathKind === "directory") {
    if (link) return node

    const dirNode = createDirectory(new Date())
    const dirCID = await store(dirNode, depot)

    const links = addLink(node.Links, name, dirCID)
    return { ...node, Links: links }
  }

  // File
  if (!fileCID) throw new Error("Need a file CID when adding a UnixFS file")

  const links = link
    ? replaceLinkHash(node.Links, name, fileCID)
    : addLink(node.Links, name, fileCID)

  return { ...node, Links: links }
}

/**
 * Load a UnixFS node.
 */
export async function load(cid: CID, depot: Depot.Implementation): Promise<PBNode> {
  return DagPB.decode(
    await depot.getBlock(cid)
  )
}

/**
 * Remove a node from a UnixFS tree.
 */
export async function removeNodeFromTree(
  node: PBNode,
  path: Path.Distinctive<Path.Segments>,
  depot: Depot.Implementation
): Promise<PBNode> {
  const pathKind = Path.kind(path)
  const pathParts = Path.unwrap(path)
  const name = pathParts[0]
  const link = node.Links.find(l => l.Name === name)

  // Directory
  // ---------
  if (Path.length(path) > 1) {
    let dirNode: PBNode

    if (link?.Hash) {
      dirNode = await load(link.Hash, depot)
    } else {
      return node
    }

    const newDirNode = await removeNodeFromTree(
      dirNode,
      Path.fromKind(pathKind, ...pathParts.slice(1)),
      depot
    )

    const dirCID = await store(newDirNode, depot)
    const links = link
      ? replaceLinkHash(node.Links, name, dirCID)
      : addLink(node.Links, name, dirCID)

    return { ...node, Links: links }
  }

  // Last part of path
  // -----------------
  if (!link) return node
  return { ...node, Links: node.Links.filter(l => l.Name !== name) }
}

/**
 * Store a UnixFS node.
 */
export async function store(node: PBNode, depot: Depot.Implementation): Promise<CID> {
  return depot.putBlock(
    DagPB.encode(node),
    DagPB.code
  )
}

////////
// ㊙️ //
////////

function addLink(links: PBLink[], name: string, hash: CID): PBLink[] {
  return [...links, DagPB.createLink(name, 0, hash)].sort(linkSorter)
}

function replaceLinkHash(links: PBLink[], name: string, hash: CID): PBLink[] {
  return links.map(l => l.Name === name ? { ...l, Hash: hash } : l)
}

function linkSorter(a: PBLink, b: PBLink): number {
  if ((a.Name || "") > (b.Name || "")) return 1
  if ((a.Name || "") < (b.Name || "")) return -1
  return 0
}
