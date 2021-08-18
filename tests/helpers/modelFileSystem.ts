import * as fc from "fast-check"

export type Path = [string, ...string[]]

export interface FileSystemState {
  files: Map<string, string>
  directories: Set<string>
}

export function initialFileSystemState(): FileSystemState {
  return {
    files: new Map(),
    directories: new Set()
  }
}

export type FileSystemOperation
  = { op: "write"; path: Path; content: string }
  | { op: "mkdir"; path: Path }
  | { op: "remove"; path: Path }


export function runOperation(state: FileSystemState, operation: FileSystemOperation): FileSystemState {
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



interface FileSystemModel {
  state: FileSystemState
  ops: FileSystemOperation[]
}

export function arbitraryFileSystemModel({ numOperations }: { numOperations: number }): fc.Arbitrary<FileSystemModel> {
  let arbitrary: fc.Arbitrary<FileSystemModel> = fc.constant({
    state: initialFileSystemState(),
    ops: []
  })
  while (numOperations-- > 0) {
    arbitrary = arbitrary.chain(arbitraryFileSystemModelStep)
  }
  return arbitrary
}

function arbitraryFileSystemModelStep(model: FileSystemModel): fc.Arbitrary<FileSystemModel> {
  return arbitraryOperation(model.state).map(operation => ({
    state: runOperation(model.state, operation),
    ops: [...model.ops, operation],
  }))
}

function arbitraryOperation(state: FileSystemState): fc.Arbitrary<FileSystemOperation> {
  if (state.files.size > 0 || state.directories.size > 0) {
    return fc.oneof(arbitraryWrite(state), arbitraryMkdir(state), arbitraryRemove(state))
  }
  return fc.oneof(arbitraryWrite(state), arbitraryMkdir(state))
}

function arbitraryWrite(state: FileSystemState): fc.Arbitrary<FileSystemOperation> {
  // write new
  const possiblePaths = [arbitraryPath().filter(path => !pathExistsInState(path, state))]
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

function arbitraryMkdir(state: FileSystemState): fc.Arbitrary<FileSystemOperation> {
  return fc.record({
    op: fc.constant("mkdir"),
    path: arbitraryPath().filter(path => !pathExistsInState(path, state))
  })
}

function arbitraryRemove(state: FileSystemState): fc.Arbitrary<FileSystemOperation> {
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
  return fc.array(fc.webSegment().filter(segment => segment.length > 0), { minLength: 1, maxLength: 8 }) as fc.Arbitrary<Path>
}

function pathExistsInState(path: Path, state: FileSystemState): boolean {
  const posix = toPosix(path)
  if (state.files.has(posix)) return true
  if (state.directories.has(posix)) return true
  return false
}
