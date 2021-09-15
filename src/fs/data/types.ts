import CID from "cids"
import { CborForm } from "./common.js"

type Encoding = "utf8" | "json" | "cbor" | "raw" | "cid"

interface EncodingOptions {
  encoding: Encoding
}

type EncodingType<E extends Encoding>
  = E extends "utf8" ? string
  : E extends "raw" ? Uint8Array
  : E extends "cid" ? CID
  : E extends "cbor" ? CborForm
  : unknown

export interface ReadableDirectory {
  read(path: [string, ...string[]], options: EncodingOptions): Promise<EncodingType<typeof options.encoding>>
  exists(path: [string, ...string[]]): Promise<boolean>
  ls(path: [string, ...string[]]): Promise<null | string[]>
  historyFor(path: [string, ...string[]]): AsyncIterator<ReadableDirectory | ReadableFile>
}

export interface WritableDirectory extends ReadableDirectory {
  write(path: [string, ...string[]], content: EncodingType<typeof options.encoding>, options: EncodingOptions): Promise<void>
  mkdir(path: [string, ...string[]]): Promise<void>
  // cp
}

export interface ReadableFile {
  read(options: EncodingOptions): Promise<EncodingType<typeof options.encoding>>
}

export interface WriteableFile extends ReadableFile {
  write(content: EncodingType<typeof options.encoding>, options: EncodingOptions): Promise<void>
}
