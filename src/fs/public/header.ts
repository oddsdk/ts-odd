import { SemVer, NodeMap } from '../types'
import semver from '../semver'
import { isString, isBool, isNum } from '../../common/type-checks'
import { isSemVer, isNodeMap } from '../types/check'
import { Maybe } from '../../common'
import { CID } from '../../ipfs'
import header, { checkValue, UnstructuredHeader } from '../normalizer/header'


export const Index = { name: 'index', check: isString }
export const Name = { name: 'name', check: isString }
export const Version = { name: 'name', check: isSemVer } 
export const Key = { name: 'key', check: isString } 
export const Cache = { name: 'cache', check: isNodeMap }
export const IsFile = { name: 'isFile', check: isBool }
export const Mtime = { name: 'mtime', check: isNum }
export const Size = { name: 'size', check: isNum }

export const values = ['name', 'version', 'key', 'cache', 'isFile', 'mtime', 'size']

export interface HeaderV1 {
  name: string
  isFile: boolean
  mtime: number
  size: number
  version: SemVer
  key: Maybe<string>
  cache: NodeMap
}

export const empty = (): HeaderV1 => ({
  name: '',
  version: semver.latest,
  key: null,
  cache: {},
  isFile: false,
  mtime: Date.now(),
  size: 0
})

type Result = {
  index: string,
  header: HeaderV1
}

export const getHeaderAndIndex = async (cid: CID, parentKey: Maybe<string>): Promise<Result> => {
  const result = await header.getHeaderAndIndex(cid, parentKey, values)
  const unstructured = result.header
  const headerVal = parseAndCheck(unstructured)
  return { index: result.index, header: headerVal }
}

export const parseAndCheck = (decoded: UnstructuredHeader): HeaderV1 => {
  return {
    name: checkValue(decoded.name, isString),
    version: checkValue(decoded.version, isSemVer),
    key: checkValue(decoded.key, isString, true),
    cache: checkValue(decoded.cache, isNodeMap),
    isFile: checkValue(decoded.isFile, isBool),
    mtime: checkValue(decoded.mtime, isNum),
    size: checkValue(decoded.size, isNum),
  }
}

export type HeaderValue = {
  name: string
  check: <T>(obj: any) => obj is T
}

export default {
  empty,
  getHeaderAndIndex,
  parseAndCheck
}
