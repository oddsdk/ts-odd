export type IPFS = {
  add(data: FileContent, options?: unknown): UnixFSFile
  cat(cid: CID): AsyncIterable<FileContentRaw>
  ls(cid: CID): AsyncIterable<UnixFSFile>
  dns(domain: string): Promise<CID>
  dag: DagAPI
  files: FilesAPI
  object: ObjectAPI
  swarm: SwarmAPI
}

export type DAGNode = {
  Links: DAGLink[]
  size: number
  toDAGLink: (opt?: { name?: string }) => Promise<DAGLink>
  addLink: (link: DAGLink) => void
  rmLink: (name: string) => void
  toJSON: () => Record<string, unknown>
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
  put(dagNode: unknown, options: unknown): Promise<CIDObj>
  get(cid: string | CID, path?: string, options?: unknown): Promise<RawDAGNode>
  resolve(cid: string | CID | CIDObj): Promise<{ cid: CIDObj }>
  tree(cid: string | CID, path?: string, options?: unknown): Promise<Array<string>>
}

export interface FilesAPI {
  stat: (cid: CID | CIDObj) => Promise<{ CumulativeSize: number }>
}

export interface ObjectAPI {
  stat(cid: CID | CIDObj): Promise<ObjStat>
  put(dagNode: unknown, options: unknown): Promise<CIDObj>
  get(cid: CID, path?: string, options?: unknown): Promise<RawDAGNode>
  tree(cid: CID, path?: string, options?: unknown): Promise<unknown>
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

export type FileContent = Record<string, unknown> | Buffer | Blob | string | number | boolean
export type FileContentRaw = Buffer

export type FileMode = number

export type UnixFSFile = {
  cid: CIDObj
  path: string
  size: number
  mode?: FileMode
  mtime?: number
  name?: string
  type?: string
}

export type ObjStat = {
  Hash: string
  NumLinks: number
  BlockSize: number
  LinksSize: number
  DataSize: number
  CumulativeSize: number
}

export type AddResult = {
  cid: CID
  size: number
}

export type SwarmAPI = {
  connect: (address: string) => Promise<unknown>
}
