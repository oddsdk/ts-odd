import { NonEmptyPath } from './types'

export function split(path: string): string[] {
  return path.split('/').filter(p => p.length > 0)
}

export function splitNonEmpty(path: string): NonEmptyPath | null {
  const parts = split(path)
  if(parts.length < 1){
    return null
  }
  return parts as NonEmptyPath
}

export function nextNonEmpty(parts: NonEmptyPath): NonEmptyPath | null {
  const next = parts.slice(1)
  if(next.length < 1){
    return null
  }
  return next as NonEmptyPath
}


export default {
  split,
  splitNonEmpty,
  nextNonEmpty
}
