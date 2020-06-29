import { NonEmptyPath } from './types'

// segments
export const splitParts = (path: string): string[] => {
  return path.split('/').filter(p => p.length > 0) // why not `p == ''`
}

export const join = (parts: string[]): string => {
  return parts.join('/')
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
  if (parts.length < 1) { // === 0?
    return null
  }
  return parts as NonEmptyPath
}

export const nextNonEmpty = (parts: NonEmptyPath): NonEmptyPath | null => {
  const next = parts.slice(1)
  if (next.length < 1) { // === 0
    return null
  }
  return next as NonEmptyPath
}


export default {
  splitParts,
  join,
  takeHead,
  splitNonEmpty,
  nextNonEmpty
}
