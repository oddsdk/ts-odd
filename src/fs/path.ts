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
