import { AppInfo } from "../appInfo.js"
import { Maybe } from "../common/types.js"


export enum Branch {
  Public = "public",
  Pretty = "p",
  Private = "private",
  PrivateLog = "privateLog",
  Shared = "shared",
  SharedCounter = "sharedCounter",
  Version = "version"
}

export enum Kind {
  Directory = "directory",
  File = "file"
}

export type Segments = string[]
export type Branched = [ Branch, ...Segments ]

export type Private = [ Branch.Private, ...Segments ]
export type Public = [ Branch.Public, ...Segments ]

export type DirectoryPath<P> = { directory: P }
export type FilePath<P> = { file: P }

/**
 * A file or directory path.
 */
export type DistinctivePath<P> = DirectoryPath<P> | FilePath<P>

/**
 * Alias for `DirectoryPath`
 */
export type Directory<P> = DirectoryPath<P>

/**
 * Alias for `FilePath`
 */
export type File<P> = FilePath<P>

/**
 * Alias for `DistinctivePath`
 */
export type Distinctive<P> = DistinctivePath<P>



// CREATION


/**
 * Utility function to create a `DirectoryPath`
 */
export function directory(...args: Branched): DirectoryPath<Branched>
export function directory(...args: Segments): DirectoryPath<Segments>
export function directory(...args: Segments | Branched): DirectoryPath<Segments | Branched> {
  if (args.some(p => p.includes("/"))) {
    throw new Error("Forward slashes `/` are not allowed")
  }
  return { directory: args }
}

/**
 * Utility function to create a `FilePath`
 */
export function file(...args: Branched): FilePath<Branched>
export function file(...args: Segments): FilePath<Segments>
export function file(...args: Segments | Branched): FilePath<Segments | Branched> {
  if (args.some(p => p.includes("/"))) {
    throw new Error("Forward slashes `/` are not allowed")
  }
  return { file: args }
}

/**
 * Utility function to create a root `DirectoryPath`
 */
export function root(): DirectoryPath<Segments> {
  return { directory: [] }
}

/**
 * Utility function create an app data path.
 */
export function appData(app: AppInfo): DirectoryPath<Branched>
export function appData(app: AppInfo, suffix: FilePath<Segments>): FilePath<Branched>
export function appData(app: AppInfo, suffix: DirectoryPath<Segments>): DirectoryPath<Branched>
export function appData(app: AppInfo, suffix: DistinctivePath<Segments>): DistinctivePath<Branched>
export function appData(app: AppInfo, suffix?: DistinctivePath<Segments>): DistinctivePath<Branched> {
  return directory(Branch.Private, "Apps", app.creator, app.name, ...(suffix ? unwrap(suffix) : []))
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
export function fromPosix(path: string): DistinctivePath<Segments> {
  const split = path.replace(/^\/+/, "").split("/")
  if (path.endsWith("/")) return { directory: split.slice(0, -1) }
  else if (path === "") return root()
  return { file: split }
}

/**
 * Transform a `DistinctivePath` into a string.
 *
 * Directories will have the format `path/to/dir/` and
 * files will have the format `path/to/file`.
 */
export function toPosix(
  path: DistinctivePath<Segments>,
  { absolute }: { absolute: boolean } = { absolute: false }
): string {
  const prefix = absolute ? "/" : ""
  const joinedPath = unwrap(path).join("/")
  if (isDirectory(path)) return prefix + joinedPath + (joinedPath.length ? "/" : "")
  return prefix + joinedPath
}



// 🛠


/**
 * Combine two `DistinctivePath`s.
 */
export function combine(a: DirectoryPath<Branched>, b: FilePath<Segments>): FilePath<Branched>
export function combine(a: DirectoryPath<Segments>, b: FilePath<Segments>): FilePath<Segments>
export function combine(a: DirectoryPath<Branched>, b: DirectoryPath<Segments>): DirectoryPath<Branched>
export function combine(a: DirectoryPath<Segments>, b: DirectoryPath<Segments>): DirectoryPath<Segments>
export function combine(a: DirectoryPath<Branched>, b: DistinctivePath<Segments>): DistinctivePath<Branched>
export function combine(a: DirectoryPath<Segments>, b: DistinctivePath<Segments>): DistinctivePath<Segments>
export function combine(a: DirectoryPath<Segments>, b: DistinctivePath<Segments>): DistinctivePath<Segments> {
  return map(p => unwrap(a).concat(p), b)
}

/**
 * Is this `DistinctivePath` of the given `Branch`?
 */
export function isBranch(branch: Branch, path: DistinctivePath<Segments>): boolean {
  return unwrap(path)[ 0 ] === branch
}

/**
 * Is this `DistinctivePath` a directory?
 */
export function isDirectory<P>(path: DistinctivePath<P>): path is DirectoryPath<P> {
  return !!(path as DirectoryPath<P>).directory
}

/**
 * Is this `DistinctivePath` a file?
 */
export function isFile<P>(path: DistinctivePath<P>): path is FilePath<P> {
  return !!(path as FilePath<P>).file
}

/**
 * Is this `DirectoryPath` a root directory?
 */
export function isRootDirectory(path: DirectoryPath<Segments>): boolean {
  return path.directory.length === 0
}

/**
 * Check if two `DistinctivePath` have the same `Branch`.
 */
export function isSameBranch(a: DistinctivePath<Segments>, b: DistinctivePath<Segments>): boolean {
  return unwrap(a)[ 0 ] === unwrap(b)[ 0 ]
}

/**
 * Check if two `DistinctivePath` are of the same kind.
 */
export function isSameKind(a: DistinctivePath<Segments>, b: DistinctivePath<Segments>): boolean {
  if (isDirectory(a) && isDirectory(b)) return true
  else if (isFile(a) && isFile(b)) return true
  else return false
}

/**
 * What `Kind` of path are we dealing with?
 */
export function kind(path: DistinctivePath<Segments>): Kind {
  if (isDirectory(path)) return Kind.Directory
  return Kind.File
}

/**
 * Map a `DistinctivePath`.
 */
export function map<P>(fn: (p: P) => P, path: DistinctivePath<P>): DistinctivePath<P> {
  if (isDirectory(path)) return { directory: fn(path.directory) }
  else if (isFile(path)) return { file: fn(path.file) }
  return path
}

/**
 * Get the parent directory of a `DistinctivePath`.
 */
export function parent(path: DistinctivePath<Segments>): Maybe<DirectoryPath<Segments>> {
  return isDirectory(path) && isRootDirectory(path as DirectoryPath<Segments>)
    ? null
    : directory(...unwrap(path).slice(0, -1))
}

/**
 * Remove the `Branch` of a `DistinctivePath` (ie. the top-level directory)
 */
export function removeBranch(path: DistinctivePath<Segments>): DistinctivePath<Segments> {
  return map(
    p => isDirectory(path) || p.length > 1 ? p.slice(1) : p,
    path
  )
}

/**
 * Get the last part of the path.
 */
export function terminus(path: DistinctivePath<Segments>): Maybe<string> {
  const u = unwrap(path)
  if (u.length < 1) return null
  return u[ u.length - 1 ]
}

/**
 * Unwrap a `DistinctivePath`.
 */
export function unwrap<P>(path: DistinctivePath<P>): P {
  if (isDirectory(path)) {
    return path.directory
  } else if (isFile(path)) {
    return path.file
  }

  throw new Error("Path is neither a directory or a file")
}

/**
 * Utility function to prefix a path with a `Branch`.
 */
export function withBranch(branch: Branch, path: DirectoryPath<Segments>): DirectoryPath<Branched>
export function withBranch(branch: Branch, path: FilePath<Segments>): FilePath<Branched>
export function withBranch(branch: Branch, path: DistinctivePath<Segments>): DistinctivePath<Branched>
export function withBranch(branch: Branch, path: DistinctivePath<Segments>): DistinctivePath<Branched> {
  return combine(
    { directory: [ branch ] },
    path
  )
}



// ⚗️


/**
 * Render a raw `Path` to a string for logging purposes.
 */
export function log(path: Segments): string {
  return `[ ${path.join(", ")} ]`
}
