import { SimpleTree, SemVer, HeaderV1, Tree, SimpleFile } from "./types"
import { CID, FileContent } from "../ipfs"
import { Maybe, isJust } from "../common"
import { constructors as PublicTreeV1 } from './v1/PublicTree'
import { constructors as PrivateTreeV1 } from './v1/PrivateTree'
import { constructors as PublicFileV1 } from './v1/PublicFile'
import { constructors as PrivateFileV1 } from './v1/PrivateFile'
import { constructors as BareTree } from './bare/tree'
import { constructors as BareFile } from './bare/file'
import semver from "./semver"
import header from "./network/header"

export const emptyTree = async (version: SemVer, key: Maybe<string>): Promise<SimpleTree> => {
  if(version === semver.v1) {
    return isJust(key)
            ? PrivateTreeV1.empty(key)
            : PublicTreeV1.empty()
  }
  return BareTree.empty()
}

export const treeFromCID = async (cid: CID, key: Maybe<string>): Promise<SimpleTree> => {
  const version = await header.getVersion(cid, key)
  if(version === semver.v1) {
    return isJust(key)
            ? PrivateTreeV1.fromCID(cid, key)
            : PublicTreeV1.fromCID(cid)
  }
  return BareTree.fromCID(cid)
}

export const treeFromHeader = (header: HeaderV1, key: Maybe<string>): Tree => {
  if(header.version === semver.v1) {
    return isJust(key)
            ? PrivateTreeV1.fromHeader(header, key)
            : PublicTreeV1.fromHeader(header)
  }
  throw new Error("This version of tree is not supported")
}

export const createFile = async (version: SemVer, content: FileContent, key: Maybe<string>): Promise<SimpleFile> => {
  if(version === semver.v1) {
    return isJust(key)
            ? PrivateFileV1.create(content, key)
            : PublicFileV1.create(content)
  }
  return BareFile.create(content)
}

export const fileFromCID = async (cid: CID, key: Maybe<string>): Promise<SimpleFile> => {
  const version = await header.getVersion(cid, key)
  if(version === semver.v1) {
    return isJust(key)
            ? PrivateFileV1.fromCID(cid, key)
            : PublicFileV1.fromCID(cid)
  }
  return BareFile.fromCID(cid)
}
