import { Maybe } from './common/types'


export enum Branch {
  Public = 'public',
  Pretty = 'p',
  Private = 'private',
  PrivateLog = 'privateLog',
  Version = 'version'
}

export type Path = string[]

export type DirectoryPath = { directory: Path }
export type FilePath = { file: Path }

/**
 * The primarily used type for paths.
 */
export type DistinctivePath = DirectoryPath | FilePath



// CREATION


/**
 * Utility function to create a `DirectoryPath`
 */
export function directory(...args: Path): DirectoryPath {
  return { directory: args }
}

/**
 * Utility function to create a `FilePath`
 */
export function file(...args: Path): FilePath {
  return { file: args }
}

/**
 * Utility function to create a root `DirectoryPath`
 */
export function rootDirectory(): DirectoryPath {
  return { directory: [] }
}



// POSIX


/**
 * Transform a string into a `DistinctivePath`.
 *
 * Directories should have the format `path/to/dir/` and
 * files should have the format `path/to/file`.
 *
 * Leading forward slashes are removed too, so you can pass absolute paths.
 */
export function fromPosix(path: string): DistinctivePath {
  const split = path.replace(/^\/+/, "").split("/")
  if (path.endsWith("/")) return { directory: split.slice(0, -1) }
  return { file: split }
}

/**
 * Transform a `DistinctivePath` into a string.
 *
 * Directories will have the format `path/to/dir/` and
 * files will have the format `path/to/file`.
 */
export function toPosix(
  path: DistinctivePath,
  { absolute }: { absolute: boolean } = { absolute: false }
): string {
  const prefix = absolute ? "/" : ""
  const joinedPath = unwrap(path).join("/")
  if (isDirectory(path)) return prefix + joinedPath + "/"
  return prefix + joinedPath
}



// 🛠


/**
 * Combine two `DistinctivePath`s.
 */
export function combine(a: DistinctivePath, b: DistinctivePath): DistinctivePath {
  const unwrappedA = unwrap(a)
  if (isDirectory(b)) return { directory: unwrappedA.concat(b.directory) }
  return { file: unwrappedA.concat(b.file) }
}

/**
 * Is this `DistinctivePath` of the given `Branch`?
 */
export function isBranch(branch: Branch, path: DistinctivePath): boolean {
  return unwrap(path)[0] === branch
}

/**
 * Is this `DistinctivePath` a directory?
 */
export function isDirectory(path: DistinctivePath): path is DirectoryPath {
  return !!(path as DirectoryPath).directory
}

/**
 * Is this `DistinctivePath` a file?
 */
export function isFile(path: DistinctivePath): path is FilePath {
  return !!(path as FilePath).file
}

/**
 * Is this `DirectoryPath` a root directory?
 */
export function isRootDirectory(path: DirectoryPath): boolean {
  return path.directory.length === 0
}

/**
 * Check if two `DistinctivePath` have the same `Branch`.
 */
export function isSameBranch(a: DistinctivePath, b: DistinctivePath): boolean {
  return unwrap(a)[0] === unwrap(b)[0]
}

/**
 * Map a `DistinctivePath`.
 */
export function map(fn: (p: Path) => Path, path: DistinctivePath): DistinctivePath {
  if (isDirectory(path)) return { directory: fn(path.directory) }
  else if (isFile(path)) return { file: fn(path.file) }
  return path
}

/**
 * Get the parent directory of a `DistinctivePath`.
 */
export function parent(path: DistinctivePath): Maybe<DirectoryPath> {
  return isDirectory(path) && isRootDirectory(path as DirectoryPath)
    ? null
    : directory(...unwrap(path).slice(0, -1))
}

/**
 * Remove the `Branch` of a `DistinctivePath` (ie. the top-level directory)
 */
export function removeBranch(path: DistinctivePath): DistinctivePath {
  return map(
    p => isDirectory(path) || p.length > 1 ? p.slice(1) : p,
    path
  )
}

/**
 * Unwrap a `DistinctivePath`.
 */
export function unwrap(path: DistinctivePath): Path {
  if (isDirectory(path)) {
    return path.directory
  } else if (isFile(path)) {
    return path.file
  }

  return []
}



// ⚗️


/**
 * Render a raw `Path` to a string for logging purposes.
 */
export function log(path: Path): string {
  return `[ ${path.join(", ")} ]`
}
