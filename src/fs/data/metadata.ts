import CID from "cids"
import * as cbor from "cborg"
import { OperationContext } from "./ref.js"
import { SemVer, v1 } from "./semver.js"
import { hasProp } from "./common.js"

export type UnixFileMode = number

export enum UnixNodeType {
  Raw = "raw",
  Directory = "dir",
  File = "file",
  Metadata = "metadata",
  Symlink = "symlink",
  HAMTShard = "hamtShard",
}

export type UnixMeta = {
  mtime: number
  ctime: number
  mode: UnixFileMode
  _type: string
}

export type Metadata = {
  unixMeta: UnixMeta
  isFile: boolean
  version: SemVer
}


export const newUnix = (isFile: boolean, now: number): UnixMeta => Object.freeze({
  mtime: now,
  ctime: now,
  mode: isFile ? 644 : 755,
  _type: isFile ? UnixNodeType.File : UnixNodeType.Directory,
})

export const newMeta = (isFile: boolean, now: number): Metadata => ({
  isFile,
  version: v1,
  unixMeta: newUnix(isFile, now)
})

export const updateMtime = (metadata: Metadata, mtime: number): Metadata => Object.freeze({
  ...metadata,
  unixMeta: {
    ...metadata.unixMeta,
    mtime
  }
})

export const newFile = (now: number): Metadata => newMeta(true, now)
export const newDirectory = (now: number): Metadata => newMeta(false, now)


export async function metadataToCID(metadata: Metadata, { ipfs, signal }: OperationContext): Promise<CID> {
  const { cid } = await ipfs.block.put(cbor.encode(metadata), { version: 1, format: "raw", pin: false, signal }) // cid version 1
  return cid
}


export async function metadataFromCID(cid: CID, { ipfs, signal }: OperationContext): Promise<Metadata> {
  const block = await ipfs.block.get(cid, { signal })

  const metadata = cbor.decode(block.data)

  if (!isMetadata(metadata)) {
    throw new Error(`Couldn't parse metadata at ${cid.toString()}`)
  }

  Object.freeze(metadata.unixMeta)
  Object.freeze(metadata.version)
  return Object.freeze(metadata)
}


export function isMetadata(object: unknown): object is Metadata {
  return hasProp(object, "unixMeta") && isUnixMeta(object.unixMeta)
    && hasProp(object, "isFile") && typeof object.isFile === "boolean"
    && hasProp(object, "version") && isSemVer(object.version)
}

export function isUnixMeta(object: unknown): object is UnixMeta {
  return hasProp(object, "mtime") && typeof object.mtime === "number"
    && hasProp(object, "ctime") && typeof object.ctime === "number"
    && hasProp(object, "mode") && typeof object.mode === "number"
    && hasProp(object, "_type") && typeof object._type === "string"
}

export function isSemVer(object: unknown): object is SemVer {
  return hasProp(object, "major") && typeof object.major === "number"
    && hasProp(object, "minor") && typeof object.minor === "number"
    && hasProp(object, "patch") && typeof object.patch === "number"
}
