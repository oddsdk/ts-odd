import * as Path from "../path/index.js"
import { Mode, isMode } from "../mode.js"


// 🏔️


export const ALLOWED_FILE_SYSTEM_ABILITIES = [ "read", "append", "delete", "overwrite", "*" ] as const



// 🧩


export type Query = AccountQuery | FileSystemQuery


export type AccountQuery = {
  query: "account"
  mode: Mode
}

export type FileSystemQuery = {
  query: "fileSystem"
  ability: typeof ALLOWED_FILE_SYSTEM_ABILITIES[ number ]
  path: Path.Distinctive<Path.Partitioned<Path.Partition>>
}



// ENCODING


export function fromJSON(query: string): Query {
  const obj = JSON.parse(query)

  switch (obj.query) {
    case "account":
      return accountQueryFromJSON(obj)

    case "fileSystem":
      return fileSystemQueryFromJSON(obj)

    default:
      throw new Error("Invalid access query")
  }
}


export function accountQueryFromJSON(obj: Record<string, any>): AccountQuery {
  if (isMode(obj.mode) === false) {
    throw new Error(`Mode in account query is not allowed: \`${obj.mode}\``)
  }

  return {
    query: obj.query,
    mode: obj.mode
  }
}


export function fileSystemQueryFromJSON(obj: Record<string, any>): FileSystemQuery {
  if (ALLOWED_FILE_SYSTEM_ABILITIES.includes(obj.ability) === false) {
    throw new Error(`Ability in file-system query is not allowed: \`${obj.ability}\``)
  }

  const path = Path.fromPosix(obj.path)
  let partitionedPath: Path.Distinctive<Path.Partitioned<Path.Partition>>

  if (Path.isPartitioned(path)) {
    partitionedPath = path
  } else {
    throw new Error(`Expected a path with a partition (private or public), got: ${obj.path}`)
  }

  return {
    query: obj.query,
    ability: obj.ability,
    path: partitionedPath,
  }
}


export function toJSON(query: Query): string {
  switch (query.query) {
    case "account":
      return JSON.stringify({
        query: query.query,
        mode: query.mode
      })

    case "fileSystem":
      return JSON.stringify({
        query: query.query,
        ability: query.ability,
        path: Path.toPosix(query.path),
      })
  }
}



// 🛠️


export function needsWriteAccess(query: FileSystemQuery): boolean {
  return query.ability !== "read"
}