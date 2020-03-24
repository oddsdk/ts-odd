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
  links: Link[]
  put(keyStr: string): Promise<CID>
  findLink(name: string): Link | null
  addLink(link: Link): Node
  rmLink(name: string): Node
  replaceLink(link: Link): Node
}
