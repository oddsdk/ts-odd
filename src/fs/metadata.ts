import type { Mtime } from "ipfs-unixfs"
import * as semver from "./semver.js"
import { SemVer } from "./semver.js"

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

export const emptyUnix = (isFile: boolean): UnixMeta => ({
  mtime: Date.now(),
  ctime: Date.now(),
  mode: isFile ? 644 : 755,
  _type: isFile ? UnixNodeType.File : UnixNodeType.Directory,
})

export const empty = (isFile: boolean): Metadata => ({
  isFile,
  version: semver.latest,
  unixMeta: emptyUnix(isFile)
})

export const updateMtime = (metadata: Metadata): Metadata => ({
  ...metadata,
  unixMeta: {
    ...metadata.unixMeta,
    mtime: Date.now()
  }
})

export function mtimeFromMs(ms: number): Mtime {
  const secs = Math.floor(ms / 1000)
  return {
    secs: secs,
    nsecs: (ms - (secs * 1000)) * 1000
  }
}
