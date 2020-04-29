import { SemVer } from './types'


const encode = (major: number, minor: number, patch: number): SemVer => {
  return {
    major,
    minor,
    patch
  }
}

const fromString = (str: string): SemVer | null => {
  const parts = str.split('.').map(parseInt)
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

const v0 = encode(0, 0, 0)
const latest = encode(1, 0, 0)


export default {
  encode,
  fromString,
  toString,
  v0,
  latest,
}
