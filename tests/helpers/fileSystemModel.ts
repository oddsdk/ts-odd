import * as fc from "fast-check"

export type Path = [string, ...string[]]

export interface FileSystemModel {
  files: Map<string, string>
  directories: Set<string>
}

export function initialFileSystemState(): FileSystemModel {
  return {
    files: new Map(),
    directories: new Set()
  }
}

export type FileSystemOperation
  = { op: "write"; path: Path; content: string }
  | { op: "mkdir"; path: Path }
  | { op: "remove"; path: Path }

export interface FileSystemUsage {
  state: FileSystemModel
  ops: FileSystemOperation[]
}



export function runOperation(state: FileSystemModel, operation: FileSystemOperation): FileSystemModel {
  switch (operation.op) {
    case "write": {
      const parents = pathParents(operation.path)
      const directories = new Set(state.directories)
      parents.forEach(parent => directories.add(toPosix(parent)))
      return {
        files: new Map(state.files).set(toPosix(operation.path), operation.content),
        directories
      }
    }
    case "mkdir": {
      const parents = pathParents(operation.path)
      const directories = new Set(state.directories)
      parents.forEach(parent => directories.add(toPosix(parent)))
      directories.add(toPosix(operation.path))
      return {
        ...state,
        directories
      }
    }
    case "remove": {
      const files = new Map(state.files)
      const directories = new Set(state.directories)
      for (const path of files.keys()) {
        if (pathStartsWith(operation.path, fromPosix(path))) files.delete(path)
      }
      for (const dir of directories.values()) {
        if (pathStartsWith(operation.path, fromPosix(dir))) directories.delete(dir)
      }
      return { files, directories }
    }
  }
}

export function runOperations(state: FileSystemModel, operations: FileSystemOperation[]): FileSystemModel {
  for (const op of operations) {
    state = runOperation(state, op)
  }
  return state
}

export function toPosix(path: Path): string {
  return path.join("/")
}

export function fromPosix(path: string): Path {
  return path.split("/") as Path // no error checking
}

function isNonEmpty(paths: string[]): paths is [string, ...string[]] {
  return paths.length > 0
}

function pathStartsWith(prefix: Path, path: Path): boolean {
  if (prefix.length > path.length) return false
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== path[i]) return false
  }
  return true
}

function pathParents(path: Path): Path[] {
  const prefix = path.slice(0, -1)
  if (!isNonEmpty(prefix)) {
    return []
  }
  return [prefix as Path, ...pathParents(prefix)]
}


export function arbitraryFileSystemUsage({ numOperations }: { numOperations: number }): fc.Arbitrary<FileSystemUsage> {
  let arbitrary: fc.Arbitrary<FileSystemUsage> = fc.constant({
    state: initialFileSystemState(),
    ops: []
  })
  while (numOperations-- > 0) {
    arbitrary = arbitrary.chain(arbitraryFileSystemModelStep)
  }
  return arbitrary
}

function arbitraryFileSystemModelStep(model: FileSystemUsage): fc.Arbitrary<FileSystemUsage> {
  return arbitraryOperation(model.state).map(operation => ({
    state: runOperation(model.state, operation),
    ops: [...model.ops, operation],
  }))
}

function arbitraryOperation(state: FileSystemModel): fc.Arbitrary<FileSystemOperation> {
  if (state.files.size > 0 || state.directories.size > 0) {
    return fc.oneof(arbitraryWrite(state), arbitraryMkdir(state), arbitraryRemove(state))
  }
  return fc.oneof(arbitraryWrite(state), arbitraryMkdir(state))
}

function arbitraryWrite(state: FileSystemModel): fc.Arbitrary<FileSystemOperation> {
  // write new
  const possiblePaths = [arbitraryPath().filter(path => pathCanBeTaken(path, state))]
  if (state.files.size > 0) {
    // write exiting (only files)
    possiblePaths.push(fc.constantFrom(...Array.from(state.files.keys()).map(fromPosix)))
  }

  return fc.record({
    op: fc.constant("write"),
    path: fc.oneof(...possiblePaths),
    content: fc.string()
  })
}

function arbitraryMkdir(state: FileSystemModel): fc.Arbitrary<FileSystemOperation> {
  return fc.record({
    op: fc.constant("mkdir"),
    path: arbitraryPath().filter(path => pathCanBeTaken(path, state))
  })
}

function arbitraryRemove(state: FileSystemModel): fc.Arbitrary<FileSystemOperation> {
  const possiblePaths: fc.Arbitrary<Path>[] = []
  if (state.files.size > 0) {
    // remove file
    possiblePaths.push(fc.constantFrom(...Array.from(state.files.keys()).map(fromPosix)))
  }
  if (state.directories.size > 0) {
    // remove directory
    possiblePaths.push(fc.constantFrom(...Array.from(state.directories).map(fromPosix)))
  }
  return fc.record({
    op: fc.constant("remove"),
    path: fc.oneof(...possiblePaths)
  })
}

function arbitraryPath(): fc.Arbitrary<Path> {
  return fc.array(
    fc.oneof(
      fc.webSegment().filter(segment => segment.length > 0),
      fc.constantFrom("a", "b", "c") // to generate more 'collisions'
    ),
    { minLength: 1, maxLength: 8 }
  ) as fc.Arbitrary<Path>
}

export function pathCanBeTaken(path: Path, state: FileSystemModel): boolean {
  const posix = toPosix(path)
  if (state.files.has(posix)) return false
  if (state.directories.has(posix)) return false
  // if there's a file at a/b, we can't allocate the path a/b/c.
  if (Array.from(state.files.keys()).find(filePath => pathStartsWith(fromPosix(filePath), path))) return false
  return true
}
