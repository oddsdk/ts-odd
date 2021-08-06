import { CID } from "ipfs-core"
import dagPb from "ipld-dag-pb"

import { DAG_NODE_DATA } from "../../ipfs/constants.js"
import { IpfsRef, PersistenceOptions } from "./ipfsRef.js"

export interface Link<T> {
  name: string
  size: number
  cid: IpfsRef<T>
}

export interface Links<T> {
  [key: string]: Link<T>
}

export async function toCID<T>(links: Links<T>, { ipfs }: PersistenceOptions): Promise<IpfsRef<Links<T>>> {
  const dagLinks = Object.values(links).map(link => new dagPb.DAGLink(link.name, link.size, link.cid))
  const dagNode = new dagPb.DAGNode(DAG_NODE_DATA, dagLinks)
  return await ipfs.dag.put(dagNode, { format: "dag-pb", hashAlg: "sha2-256", pin: false })
}

export async function fromCID<T>(cid: CID, { ipfs, signal }: PersistenceOptions): Promise<Links<T>> {
  const getResult = await ipfs.dag.get(cid, { signal })
  const dagNode: dagPb.DAGNode = getResult.value
  return dagNode.Links.reduce((acc: Links<T>, dagLink: dagPb.DAGLink) => {
    try {
      CID.validateCID(dagLink.Hash)
    } catch (e) {
      throw new Error(`Couldn't validate cid ${dagLink.Hash} in link ${dagLink.Name}`)
    }
    acc[dagLink.Name] = {
      name: dagLink.Name,
      size: dagLink.Tsize,
      cid: dagLink.Hash
    }
    return acc
  }, {})
}
