import { SemVer } from './types'
import { Maybe } from '../common'


const encode = (major: number, minor: number, patch: number): SemVer => {
  return {
    major,
    minor,
    patch
  }
}

const fromString = (str: string): Maybe<SemVer> => {
  const parts = str.split('.').map(x => parseInt(x)) // dont shorten this because parseInt has a second param
  if (parts.length !== 3 || parts.some(p => typeof p !== 'number')) {
    return null
  }
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2]
  }
}

const toString = (version: SemVer): string => {
  const { major, minor, patch } = version
  return `${major}.${minor}.${patch}`
}

const v0 = encode(0, 0, 0) // Hmm I wonder if we can do comparisons `version < Major(1)`
const v1 = encode(1, 0, 0)
const latest = encode(1, 0, 0)


export default {
  encode,
  fromString,
  toString,
  v0,
  v1,
  latest,
}
