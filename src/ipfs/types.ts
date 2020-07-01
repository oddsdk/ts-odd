export type IPFS = {
  add(data: FileContent, options?: unknown): AsyncIterable<UnixFSFile>
  cat(cid: CID): AsyncIterable<FileContentRaw>
  ls(cid: CID): AsyncIterable<UnixFSFile>
  dag: DagAPI
  object: ObjectAPI
  dns(domain: string): Promise<CID>
}

// Serializatin only
export type DAGNode = {
  Links: DAGLink[]
  size: number
  toDAGLink: (opt?: { name?: string }) => Promise<DAGLink>
  addLink: (link: DAGLink) => void
  rmLink: (name: string) => void
  toJSON: () => object
}

// Serialziation only
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
  tree(cid: string | CID, path?: string, options?: unknown): Promise<unknown>
}

export interface ObjectAPI {
  stat(cid: CID): Promise<ObjStat>
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

// Why have Content and ContentRaw separate?
export type FileContent = object | Blob | string | number | boolean
export type FileContentRaw = Buffer

// Why?
export type FileMode = number

// Is this an IPFS type, or ours?
// ANSWER: it's the built-in one
export type UnixFSFile = {
  cid: CIDObj
  path: string
  size: number
  mode?: FileMode // UCAN
  mtime?: number  // I'm divided on this one, because distributed systems and clock drift
                  // We may stamp each generation instead?
  name?: string   // Handle with structural links
  type?: string   // Ya, probably a good idea. Extension if nothing else
}

// cool cool
export type ObjStat = {
  Hash: string
  NumLinks: number
  BlockSize: number
  LinksSize: number
  DataSize: number
  CumulativeSize: number
}

// What is "Add Result"? Could use better naming
export type AddResult = {
  cid: CID
  size: number
}
