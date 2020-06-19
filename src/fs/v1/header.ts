import {  UnstructuredHeader, HeaderV1 } from '../types'
import semver from '../semver'
import { isString, isBool, isNum } from '../../common/type-checks'
import { isSemVer, isNodeMap, isPinMap } from '../types/check'
import { Maybe } from '../../common'
import { CID } from '../../ipfs'
import header, { checkValue } from '../network/header'

export const values = ['name', 'isFile', 'mtime', 'size', 'version', 'fileIndex', 'pins']

export const empty = (): HeaderV1 => ({
  name: '',
  isFile: false,
  mtime: Date.now(),
  size: 0,
  version: semver.latest,
  key: null,
  fileIndex: {},
  pins: {}
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
    isFile: checkValue(decoded.isFile, isBool),
    mtime: checkValue(decoded.mtime, isNum),
    size: checkValue(decoded.size, isNum),
    version: checkValue(decoded.version, isSemVer),
    key: checkValue(decoded.key, isString, true),
    fileIndex: checkValue(decoded.fileIndex, isNodeMap),
    pins: checkValue(decoded.pins, isPinMap)
  }
}

export default {
  empty,
  getHeaderAndIndex,
  parseAndCheck
}
