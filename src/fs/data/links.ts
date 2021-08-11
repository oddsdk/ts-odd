import { CID } from "ipfs-core"
import dagPb from "ipld-dag-pb"

import { DAG_NODE_DATA } from "../../ipfs/constants.js"
import { FromCID, LazyCIDRef, lazyRefFromCID, PersistenceOptions, ToCID } from "./ref.js"


export interface UnixFSLink<T> {
  size: number
  link: T
}


export async function linkFromCID(cid: CID, { ipfs, signal }: PersistenceOptions): Promise<UnixFSLink<CID>> {
  const stat = await ipfs.files.stat(cid, { signal })
  return {
    size: stat.cumulativeSize,
    link: cid
  }
}

function linksToDAG(links: Record<string, UnixFSLink<CID>>): dagPb.DAGNode {
  const dagNode = new dagPb.DAGNode(DAG_NODE_DATA)

  for (const [name, link] of Object.entries(links)) {
    dagNode.addLink(new dagPb.DAGLink(name, link.size, link.link))
  }

  return dagNode
}


export async function linksToCID(links: Record<string, UnixFSLink<CID>>, { ipfs, signal }: PersistenceOptions): Promise<CID> {
  const dagNode = linksToDAG(links)
  return await ipfs.dag.put(dagNode, { version: 1, format: "dag-pb", hashAlg: "sha2-256", pin: false, signal })
}


export async function lazyLinksToCID(links: Record<string, UnixFSLink<LazyCIDRef<unknown>>>, options: PersistenceOptions): Promise<CID> {
  const linksModified: Record<string, UnixFSLink<CID>> = {}
  for (const [name, link] of Object.entries(links)) {
    linksModified[name] = await linkFromCID(await link.link.ref(options), options)
  }
  return await linksToCID(linksModified, options)
}


export async function linksFromCID(cid: CID, { ipfs, signal }: PersistenceOptions): Promise<Record<string, UnixFSLink<CID>>> {
  const getResult = await ipfs.dag.get(cid, { signal })
  const dagNode: dagPb.DAGNode = getResult.value

  const links: Record<string, UnixFSLink<CID>> = {}
  for (const dagLink of dagNode.Links) {
    links[dagLink.Name] = await linkFromCID(cid, { ipfs, signal })
  }
  return links
}

export async function lazyLinksFromCID<T>(cid: CID, loader: FromCID<T>, options: PersistenceOptions): Promise<Record<string, UnixFSLink<LazyCIDRef<T>>>> {
  const cidLinks = await linksFromCID(cid, options)

  const lazyCIDLinks: Record<string, UnixFSLink<LazyCIDRef<T>>> = {}
  for (const [name, link] of Object.entries(cidLinks)) {
    lazyCIDLinks[name] = { ...link, link: lazyRefFromCID(link.link, loader) }
  }
  return lazyCIDLinks
}
