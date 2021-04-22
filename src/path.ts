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
  { absolute: boolean } = { absolute: false }
): string {
  const prefix = absolute ? "/" : ""
  if (path.directory) return prefix + path.join("/") + "/"
  return prefix + path.join("/")
}



// 🛠


/**
 * Combine two `DistinctivePath`s.
 */
export function combine(a: DistinctivePath, b: DistinctivePath) {
  const unwrappedA = a.directory || a.file
  if (b.directory) return { directory: unwrappedA.concat(b.directory) }
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
export function isDirectory(path: DistinctivePath): boolean {
  return !!path.directory
}

/**
 * Is this `DistinctivePath` a file?
 */
export function isFile(path: DistinctivePath): boolean {
  return !!path.file
}

/**
 * Is this `DirectoryPath` a root directory?
 */
export function isRootDirectory(path: DirectoryPath): boolean {
  return path.directory.length === 0
}

/**
 * Map a `DistinctivePath`.
 */
export function map(fn: Path => Path, path: DistinctivePath): DistinctivePath {
  if (path.directory) return { directory: fn(path.directory) }
  return { file: fn(path.file) }
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
  return a.directory || a.file
}
