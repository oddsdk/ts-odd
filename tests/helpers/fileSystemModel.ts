import * as fc from "fast-check"

export type Path = [string, ...string[]]

export interface FileSystemModel {
  files: Map<string, string>
  directories: Set<string>
}

export function initialFileSystemModel(): FileSystemModel {
  return {
    files: new Map(),
    directories: new Set()
  }
}

export type FileSystemOperation
  = { op: "write"; path: Path; content: string }
  | { op: "mkdir"; path: Path }
  | { op: "remove"; path: Path }
  // | { op: "copy"; from: Path; to: Path }

export interface FileSystemUsage {
  state: FileSystemModel
  ops: FileSystemOperation[]
}


//--------------------------------------
// Operations
//--------------------------------------


export function runOperation(model: FileSystemModel, operation: FileSystemOperation): FileSystemModel {
  switch (operation.op) {
    case "write": {
      const parents = pathParents(operation.path)
      const directories = new Set(model.directories)
      parents.forEach(parent => directories.add(toPosix(parent)))
      return {
        files: new Map(model.files).set(toPosix(operation.path), operation.content),
        directories
      }
    }
    case "mkdir": {
      const parents = pathParents(operation.path)
      const directories = new Set(model.directories)
      parents.forEach(parent => directories.add(toPosix(parent)))
      directories.add(toPosix(operation.path))
      return {
        ...model,
        directories
      }
    }
    case "remove": {
      return removeFrom(model, operation.path).remaining
    }
    // case "copy": {
    //   const { remaining, removed } = removeFrom(model, operation.from)
    //   const moved = move(removed, operation.from, operation.to)
    //   return merge(remaining, moved, (_, movedFile) => movedFile)
    // }
  }
}

export function runOperations(model: FileSystemModel, operations: FileSystemOperation[]): FileSystemModel {
  for (const op of operations) {
    model = runOperation(model, op)
  }
  return model
}

export function runOperationsHistory(operations: FileSystemOperation[]): FileSystemModel[] {
  let model = initialFileSystemModel()
  const models = [model]
  for (const op of operations) {
    model = runOperation(model, op)
    models.push(model)
  }
  return models
}

export function isEmptyFileSystem(model: FileSystemModel): boolean {
  return model.directories.size === 0 && model.files.size === 0
}

export function removeFrom(model: FileSystemModel, path: Path): { remaining: FileSystemModel; removed: FileSystemModel } {
  const remainingFiles = new Map(model.files)
  const remainingDirectories = new Set(model.directories)
  const removedFiles = new Map(model.files)
  const removedDirectories = new Set(model.directories)
  for (const [file, content] of model.files.entries()) {
    if (pathStartsWith(path, fromPosix(file))) {
      remainingFiles.delete(file)
      removedFiles.set(file, content)
    }
  }
  for (const dir of model.directories.values()) {
    if (pathStartsWith(path, fromPosix(dir))) {
      remainingDirectories.delete(dir)
      removedDirectories.add(dir)
    }
  }
  return {
    remaining: { files: remainingFiles, directories: remainingDirectories },
    removed: { files: removedFiles, directories: removedDirectories }
  }
}

function move(model: FileSystemModel, from: Path, to: Path): FileSystemModel {
  const files = new Map(model.files)
  const directories = new Set(model.directories)
  for (const [fileName, content] of model.files.entries()) {
    const filePath = fromPosix(fileName)
    if (pathStartsWith(from, filePath)) {
      const rest = filePath.slice(from.length)
      const newFilepath = [...to, ...rest]
      if (!isNonEmpty(newFilepath)) continue // should never happen. Satisfies ts (maybe build `concat` operator for filepaths at some point with correct types)
      files.delete(fileName)
      files.set(toPosix(newFilepath), content)
    }
  }
  for (const directoryName of model.directories.values()) {
    const directoryPath = fromPosix(directoryName)
    if (pathStartsWith(from, directoryPath)) {
      const rest = directoryPath.slice(from.length)
      const newDirectoryPath = [...to, ...rest]
      if (!isNonEmpty(newDirectoryPath)) continue // should never happen. Satisfies ts (maybe build `concat` operator for filepaths at some point with correct types)
      directories.delete(directoryName)
      directories.add(toPosix(newDirectoryPath))
    }
  }
  return { files, directories }
}

export function merge(left: FileSystemModel, right: FileSystemModel, tieBreaker: (left: string, right: string) => string): FileSystemModel {
  const files = new Map<string, string>()
  const directories = new Set([...left.directories.values(), ...right.directories.values()])
  const allFiles = new Set([...left.files.keys(), ...right.files.keys()])
  for (const filepath of allFiles) {
    const leftFile = left.files.get(filepath)
    const rightFile = right.files.get(filepath)

    if (leftFile == null) {
      if (rightFile == null) continue // shouldn't happen
      files.set(filepath, rightFile)
    } else if (rightFile == null) {
      files.set(filepath, leftFile)
    } else {
      files.set(filepath, tieBreaker(leftFile, rightFile))
    }
  }
  return { files, directories }
}



//--------------------------------------
// Arbitrary
//--------------------------------------


export function arbitraryFileSystemUsage({ numOperations }: { numOperations: number }): fc.Arbitrary<FileSystemUsage> {
  let arbitrary: fc.Arbitrary<FileSystemUsage> = fc.constant({
    state: initialFileSystemModel(),
    ops: []
  })
  while (numOperations-- > 0) {
    arbitrary = arbitrary.chain(arbitraryFileSystemModelStep)
  }
  return arbitrary
}

function arbitraryFileSystemModelStep(usage: FileSystemUsage): fc.Arbitrary<FileSystemUsage> {
  return arbitraryOperation(usage.state).map(operation => ({
    state: runOperation(usage.state, operation),
    ops: [...usage.ops, operation],
  }))
}

function arbitraryOperation(model: FileSystemModel): fc.Arbitrary<FileSystemOperation> {
  if (model.files.size > 0 || model.directories.size > 0) {
    return fc.oneof(arbitraryWrite(model), arbitraryMkdir(model), arbitraryRemove(model))
  }
  return fc.oneof(arbitraryWrite(model), arbitraryMkdir(model))
}

function arbitraryWrite(model: FileSystemModel): fc.Arbitrary<FileSystemOperation> {
  // write new
  const possiblePaths = [arbitraryPath().filter(path => pathCanBeTaken(path, model))]
  if (model.files.size > 0) {
    // write exiting (only files)
    possiblePaths.push(fc.constantFrom(...Array.from(model.files.keys()).map(fromPosix)))
  }

  return fc.record({
    op: fc.constant("write"),
    path: fc.oneof(...possiblePaths),
    content: fc.string()
  })
}

function arbitraryMkdir(model: FileSystemModel): fc.Arbitrary<FileSystemOperation> {
  return fc.record({
    op: fc.constant("mkdir"),
    path: arbitraryPath().filter(path => pathCanBeTaken(path, model))
  })
}

function arbitraryRemove(model: FileSystemModel): fc.Arbitrary<FileSystemOperation> {
  const possiblePaths: fc.Arbitrary<Path>[] = []
  if (model.files.size > 0) {
    // remove file
    possiblePaths.push(fc.constantFrom(...Array.from(model.files.keys()).map(fromPosix)))
  }
  if (model.directories.size > 0) {
    // remove directory
    possiblePaths.push(fc.constantFrom(...Array.from(model.directories).map(fromPosix)))
  }
  return fc.record({
    op: fc.constant("remove"),
    path: fc.oneof(...possiblePaths)
  })
}

export function arbitraryPath(): fc.Arbitrary<Path> {
  return fc.array(arbitraryPathSegment(), { minLength: 1, maxLength: 8 }) as fc.Arbitrary<Path>
}

export function arbitraryPathSegment(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.webSegment().filter(segment => segment.length > 0),
    fc.constantFrom("a", "b", "c") // to generate more 'collisions'
  )
}



//--------------------------------------
// Path Operations
//--------------------------------------


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

function pathCanBeTaken(path: Path, model: FileSystemModel): boolean {
  const posix = toPosix(path)
  if (model.files.has(posix)) return false
  if (model.directories.has(posix)) return false
  // if there's a file at a/b, we can't allocate the path a/b/c.
  if (Array.from(model.files.keys()).find(filePath => pathStartsWith(fromPosix(filePath), path))) return false
  return true
}
