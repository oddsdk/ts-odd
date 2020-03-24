import { emptyDir, rawToDAGNode, toDAGLink, toLink, putDAGNode } from './helpers'
import { Link, Node } from '../types'
import { getIpfs, DAGNode, DAGLink, CID } from '../../ipfs'

export class PublicNode implements Node {

  dagNode: DAGNode

  constructor(dagNode: DAGNode) {
    this.dagNode = dagNode
  }

  async put(): Promise<CID> {
    return putDAGNode(this.dagNode)
  }

  async updateChild(child: PublicNode, name: string): Promise<PublicNode> {
    const cid = await child.put()
    const link = { name, cid } 
    return this.replaceLink(link)
  }

  async resolveChild(name: string): Promise<PublicNode | null> {
    const link = this.findLink(name)
    if(link === null) {
      return null
    }
    return resolve(link.cid)
  }

  async resolveOrAddChild(name: string): Promise<PublicNode> {
    const maybeChild = await this.resolveChild(name)
    if(maybeChild !== null) {
      return maybeChild
    }
    return empty()
  }
  
  findDAGLink(name: string): DAGLink | null {
    return this.dagNode.Links?.find(link => link.Name === name) || null
  }

  findLink(name: string): Link | null {
    const dagLink = this.findDAGLink(name)
    if(dagLink === null){
      return null
    }
    return toLink(dagLink)
  }

  addLink(link: Link): PublicNode {
    const dagLink = toDAGLink(link)
    this.dagNode.addLink(dagLink)
    return this
  }

  rmLink(name: string): PublicNode {
    this.dagNode.rmLink(name)
    return this
  }

  replaceLink(link: Link): PublicNode {
    this.rmLink(link.name)
    this.addLink(link)
    return this
  }

}

export function empty(): PublicNode {
  const dagNode = emptyDir()
  return new PublicNode(dagNode)
}

export async function resolve(cid: CID): Promise<PublicNode> {
  const ipfs = await getIpfs()
  const raw = await ipfs.dag.get(cid)
  const dagNode = rawToDAGNode(raw)
  return new PublicNode(dagNode)
}
