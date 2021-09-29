import { CID } from "multiformats/cid"
import { AbortContext, CborForm } from "./common.js"
import { Metadata } from "./metadata.js"

export type Encoding = "utf8" | "json" | "cbor" | "raw" | "cid"

export interface EncodingOptions {
  encoding: Encoding
}

export type EncodingTypeFor<E extends Encoding>
  = E extends "utf8" ? string
  : E extends "raw" ? Uint8Array
  : E extends "cid" ? CID
  : E extends "cbor" ? CborForm
  : unknown

export interface ReadableDirectory {
  read(path: string[], options: EncodingOptions  & AbortContext): Promise<EncodingTypeFor<typeof options.encoding>>
  exists(path: string[], options?: AbortContext): Promise<boolean>
  ls(path: string[], options?: AbortContext): Promise<string[]>
  // TODO
  // historyFor(path: string[], options?: AbortContext): AsyncIterator<ReadableDirectory | ReadableFile, void>
  metadataFor(path: string[], options?: AbortContext): Promise<Metadata>
}

export interface WritableDirectory extends ReadableDirectory {
  write(path: string[], content: EncodingTypeFor<typeof options.encoding>, options: EncodingOptions  & AbortContext): Promise<void>
  mkdir(path: string[], options?: AbortContext): Promise<void>
  // cp
}

export interface ReadableFile {
  read(options: EncodingOptions  & AbortContext): Promise<EncodingTypeFor<typeof options.encoding>>
  // TODO
  // history(options?: AbortContext): AsyncIterator<ReadableFile, void>
  metadata(options?: AbortContext): Promise<Metadata>
}

export interface WriteableFile extends ReadableFile {
  write(content: EncodingTypeFor<typeof options.encoding>, options: EncodingOptions  & AbortContext): Promise<void>
}

