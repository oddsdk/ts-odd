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
      const files = new Map(model.files)
      const directories = new Set(model.directories)
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

export function runOperations(model: FileSystemModel, operations: FileSystemOperation[]): FileSystemModel {
  for (const op of operations) {
    model = runOperation(model, op)
  }
  return model
}



//--------------------------------------
// Subdirectories
//--------------------------------------

export function asOperationOnSubdirectory(operation: FileSystemOperation, subdirectory: string): FileSystemOperation | null {
  if (operation.path[0] === subdirectory) {
    const sliced = operation.path.slice(1)
    if (isNonEmpty(sliced)) {
      return { ...operation, path: sliced }
    }
  }
  return null
}

export function asSubdirectoryModel(model: FileSystemModel, subdirectory: string): FileSystemModel {
  const files = new Map<string, string>()
  const directories = new Set<string>()
  
  for (const [posixPath, content] of model.files.entries()) {
    const path = fromPosix(posixPath)
    const sliced = path.slice(1)
    if (path[0] === subdirectory && isNonEmpty(sliced)) {
      files.set(toPosix(sliced), content)
    }
  }

  for (const dir of model.directories.values()) {
    const path = fromPosix(dir)
    const sliced = path.slice(1)
    if (path[0] === subdirectory && isNonEmpty(sliced)) {
      directories.add(toPosix(sliced))
    }
  }

  return { files, directories }
}

export function historyForSubdirectory(operations: FileSystemOperation[], subdirectory: string): FileSystemOperation[] {
  let filteredOps: FileSystemOperation[] = []
  for (const op of operations) {
    const subdirectoryOp = asOperationOnSubdirectory(op, subdirectory)
    if (subdirectoryOp != null) {
      filteredOps.push(subdirectoryOp)
    }
    if (removesSubdirectory(op, subdirectory)) {
      filteredOps = []
    }
  }
  return filteredOps
}

export function removesSubdirectory(operation: FileSystemOperation, subdirectory: string): boolean {
  return operation.op === "remove" && operation.path.length === 1 && operation.path[0] === subdirectory
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
