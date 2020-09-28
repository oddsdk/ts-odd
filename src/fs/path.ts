import { NonEmptyPath } from './types'

export const splitParts = (path: string): string[] => {
  return path.split('/').filter(p => p.length > 0)
}

export const join = (parts: string[]): string => {
  return parts.join('/')
}

export const joinNoSuffix = (parts: string[]): string => {
  const joined = join(parts)
  return joined[joined.length -1] === '/' 
          ? joined.slice(0, joined.length -1)
          : joined
}

type HeadParts = {
  head: string | null
  nextPath: string | null
}

export const takeHead = (path: string): HeadParts => {
  const parts = splitParts(path)
  const next = parts.slice(1)
  return {
    head: parts[0] || null,
    nextPath: next.length > 0 ? join(next) : null
  }
}

type TailParts = {
  tail: string | null
  parentPath: string | null
}

export const takeTail = (path: string): TailParts => {
  const parts = splitParts(path)
  const parent = parts.slice(0, parts.length - 1)
  return {
    tail: parts[parts.length - 1] || null,
    parentPath: parent.length > 0 ? join(parent) : null
  }
}

export const splitNonEmpty = (path: string): NonEmptyPath | null => {
  const parts = splitParts(path)
  if (parts.length < 1) {
    return null
  }
  return parts as NonEmptyPath
}

export const nextNonEmpty = (parts: NonEmptyPath): NonEmptyPath | null => {
  const next = parts.slice(1)
  if (next.length < 1) {
    return null
  }
  return next as NonEmptyPath
}

export const sameParent = (a: string, b: string): boolean => {
  return splitParts(a)[0] === splitParts(b)[0]
}
