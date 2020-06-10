import { Header } from './types'
import semver from './semver'
import { isString, isBool, isNum } from '../common/type-checks'
import { isSemVer, isNodeMap } from './types/check'

export const empty = (): Header => ({
  name: '',
  version: semver.latest,
  key: null,
  cache: {},
  isFile: false,
  mtime: Date.now(),
  size: 0
})

export type HeaderValue = {
  name: string
  check: <T>(obj: any) => obj is T
}

const Index = { name: 'index', check: isString }
const Name = { name: 'name', check: isString }
const Version = { name: 'name', check: isSemVer } 
const Key = { name: 'key', check: isString } 
const Cache = { name: 'cache', check: isNodeMap }
const IsFile = { name: 'isFile', check: isBool }
const Mtime = { name: 'mtime', check: isNum }
const Size = { name: 'size', check: isNum }

export default {
  empty
}
