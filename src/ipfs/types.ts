export type IPFS = {
  add(data: FileContent, options?: any): AsyncIterable<UnixFSFile>
  cat(cid: CID): AsyncIterable<FileContentRaw>
  ls(cid: CID): Promise<UnixFSFile[]> | AsyncIterable<UnixFSFile>
  dag: DagAPI
  object: ObjectAPI
}

export type DAGNode = {
  Links: DAGLink[]
  size: number
  toDAGLink: (opt?: { name?: string }) => Promise<DAGLink>
  addLink: (link: DAGLink) => void
  rmLink: (name: string) => void
  toJSON: () => object
}

export type DAGLink = {
  Name: string
  Hash: string
  Size: number
}

export type RawDAGNode = {
  remainderPath: string
  value: {
    _data: Uint8Array
    _links: RawDAGLink[]
    _size: number
    _serializedSize: number
  }
}

export type RawDAGLink = {
  _name: string
  _cid: CIDObj
  _size: number
}

export interface DagAPI {
  put(dagNode: any, options: any): Promise<CIDObj>
  get(cid: string | CID, path?: string, options?: any): Promise<RawDAGNode>
  tree(cid: string | CID, path?: string, options?: any): Promise<any>
}

export interface ObjectAPI {
  stat(cid: CID): Promise<ObjStat>
  put(dagNode: any, options: any): Promise<CIDObj>
  get(cid: CID, path?: string, options?: any): Promise<RawDAGNode>
  tree(cid: CID, path?: string, options?: any): Promise<any>
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
export type FileContentRaw = Uint8Array

export type FileMode = number

export type UnixFSFile = {
  cid: CIDObj
  path: string
  size: number
  mode?: FileMode
  mtime?: number 
  name?: string
}

export type ObjStat = {
  Hash: string
  NumLinks: number
  BlockSize: number
  LinksSize: number
  DataSize: number
  CumulativeSize: number
}
