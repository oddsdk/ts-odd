import CID from "cids"
import dagPb from "ipld-dag-pb"
import { getNameFromCode } from "multicodec"

import { DAG_NODE_DATA } from "../../ipfs/constants.js"
import { hasProp } from "./common.js"
import { FromCID, LazyCIDRef, lazyRefFromCID, OperationContext } from "./ref.js"



export async function linksToCID(links: Record<string, CID>, { ipfs, signal }: OperationContext): Promise<CID> {
  const dagNode = new dagPb.DAGNode(DAG_NODE_DATA)

  for (const [name, cid] of Object.entries(links)) {
    // TODO: We can Probably use Promise.all here to make this concurrent.
    const stat = await ipfs.files.stat(cid, { signal })
    // TODO: This should actually be equivalent to: (await ipfs.dag.get(cid, { signal })).value.Size
    // FIXME: Write a size cache. .stat calls take ~2ms in the median. We'll duplicate a lot of these calls
    dagNode.addLink(new dagPb.DAGLink(name, stat.cumulativeSize, cid))
  }

  return await ipfs.dag.put(dagNode, { version: 1, format: "dag-pb", hashAlg: "sha2-256", pin: false, signal })
}


export async function lazyLinksToCID(links: Record<string, LazyCIDRef<unknown>>, ctx: OperationContext): Promise<CID> {
  const linksModified: Record<string, CID> = {}
  for (const [name, link] of Object.entries(links)) {
    linksModified[name] = await link.ref(ctx)
  }
  return await linksToCID(linksModified, ctx)
}


export async function linksFromCID(cid: CID, { ipfs, signal }: OperationContext): Promise<Record<string, CID>> {
  const getResult = await ipfs.dag.get(cid, { signal })
  // we only support DAG-PB
  if (!isDAGNodeLike(getResult.value)) {
    console.log("its not?", getResult.value)
    throw new Error(`Can't read links from ${cid.toString()} (${getResult.value}), probably due to it not being in expected dag-pb format. Actual format: ${getNameFromCode(cid.code)}`)
  }
  const dagNode: dagPb.DAGNodeLike = getResult.value

  const links: Record<string, CID> = {}
  for (const dagLink of dagNode.Links || []) {
    links[dagLink.Name] = dagLink.Hash
  }
  return Object.freeze(links)
}

export async function lazyLinksFromCID<T>(cid: CID, load: FromCID<T>, ctx: OperationContext): Promise<Record<string, LazyCIDRef<T>>> {
  const cidLinks = await linksFromCID(cid, ctx)

  const lazyCIDLinks: Record<string, LazyCIDRef<T>> = {}
  for (const [name, cid] of Object.entries(cidLinks)) {
    lazyCIDLinks[name] = lazyRefFromCID(cid, load)
  }

  return Object.freeze(lazyCIDLinks)
}



//--------------------------------------
// Utilities
//--------------------------------------

// TODO Unused for now. At some point maybe experiment with mapRecordPar

export async function mapRecord<S, T>(record: Record<string, S>, f: (key: string, value: S) => Promise<T>): Promise<Record<string, T>> {
  const newRecord: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    newRecord[key] = await f(key, value)
  }
  return newRecord
}

export function mapRecordSync<S, T>(record: Record<string, S>, f: (key: string, value: S) => T): Record<string, T> {
  const newRecord: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    newRecord[key] = f(key, value)
  }
  return newRecord
}

export async function mapRecordPar<S, T>(record: Record<string, S>, f: (key: string, value: S) => Promise<T>): Promise<Record<string, T>> {
  const newRecord: Record<string, T> = {}
  await Promise.all(Object.entries(record).map(([key, value]) => f(key, value).then(result => newRecord[key] = result)))
  return newRecord
}


///

function isDAGNodeLike(dagNode: unknown): dagNode is dagPb.DAGNodeLike {
  return hasProp(dagNode, "Data") && dagNode.Data instanceof Uint8Array
    && hasProp(dagNode, "Links") && dagNode.Links instanceof Array
    && dagNode.Links.every(isDAGLinkLike)
}

function isDAGLinkLike(dagLink: unknown): dagLink is dagPb.DAGLinkLike {
  return hasProp(dagLink, "Name") && typeof dagLink.Name === "string"
    && hasProp(dagLink, "Tsize") && typeof dagLink.Tsize === "number"
    && hasProp(dagLink, "Hash") && CID.isCID(dagLink.Hash)
}
