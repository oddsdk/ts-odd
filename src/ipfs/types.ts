export type IPFS = {
  add(data: FileContent, options?: any): AsyncIterable<IPFSFile>
  dag: DagAPI
}

export type DAGNode = {
  Links: DAGLink[]
  toDAGLink: (opt?: { name?: string }) => Promise<DAGLink>
  addLink: (link: DAGLink) => void
  rmLink: (name: string) => void
}

export type DAGLink = {
  Name: string
  Hash: string
  Size: number
}

export interface DagAPI {
  put(dagNode: any, options: any): Promise<any>
  get(cid: string | CID, path?: string, options?: any): Promise<any>
  tree(cid: string | CID, path?: string, options?: any): Promise<any>
}

export type CID = string
export type Codec = string
export type MultibaseName = string

export type CIDObj = {
  codec: Codec
  multibaseName: MultibaseName
  string: CID
  version: number
}

export type FileContent = Object | Blob | string

export type FileMode = number

export type IPFSFile = {
  cid: CIDObj
  mode: FileMode
  mtime?: number 
  path: string
  size: number
}
