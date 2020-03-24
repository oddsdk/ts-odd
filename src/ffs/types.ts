import { CID } from '../ipfs'

export type AddLinkOpts = {
  shouldOverwrite?: boolean
}

export type NonEmptyPath = [string, ...string[]]

export type PrivateNodeData = {
  key: string
  links: Link[]
}

export type Link = {
  name: string
  cid: CID
  size?: number 
}

export interface Node {
  updateChild(child: Node, name: string): Promise<Node>
  resolveChild(name: string): Promise<Node | null>
  resolveOrAddChild(name: string): Promise<Node>
  findLink(name: string): Link | null
  addLink(link: Link): Node
  rmLink(name: string): Node
  replaceLink(link: Link): Node
}
