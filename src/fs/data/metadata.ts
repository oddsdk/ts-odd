import { CID } from "multiformats/cid"
import * as dagPB from "@ipld/dag-pb"
import * as cbor from "cborg"
import { SemVer, v1 } from "./semver.js"
import { hasProp } from "./common.js"
import { OperationContext } from "./public/publicNode.js"

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


export async function metadataToCID(metadata: Metadata, { putBlock, signal }: OperationContext): Promise<CID> {
  return await putBlock(dagPB.encode(dagPB.prepare(cbor.encode(metadata))), { signal })
}


export async function metadataFromCID(cid: CID, { getBlock, signal }: OperationContext): Promise<Metadata> {
  const block = dagPB.decode(await getBlock(cid, { signal }))
  if (block.Data == null) {
    throw new Error(`No data provided for metadata at CID ${cid.toString()}`)
  }

  const metadata = cbor.decode(block.Data)

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
