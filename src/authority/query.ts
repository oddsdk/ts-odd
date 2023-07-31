import * as Path from "../path/index.js"

////////
// 🏔️ //
////////

export const ALLOWED_FILE_SYSTEM_ABILITIES = ["read", "append", "delete", "overwrite", "*"] as const

////////
// 🧩 //
////////

export type Query = AccountQuery | FileSystemQuery

export type AccountQuery = {
  query: "account"
}

export type FileSystemQuery = {
  query: "fileSystem"
  ability: typeof ALLOWED_FILE_SYSTEM_ABILITIES[number]
  path: Path.Distinctive<Path.Partitioned<Path.Partition>>
}

////////
// 🏔️️ //
////////

export const account: AccountQuery = {
  query: "account",
}

export const fileSystem = {
  rootAccess: [{
    query: "fileSystem",
    ability: "*",
    path: Path.directory("public"),
  }, {
    query: "fileSystem",
    ability: "*",
    path: Path.directory("private"),
  }] as FileSystemQuery[],
  limitedAccess(
    ability: typeof ALLOWED_FILE_SYSTEM_ABILITIES[number],
    path: Path.Distinctive<Path.Partitioned<Path.Partition>>
  ): FileSystemQuery {
    return {
      query: "fileSystem",
      ability,
      path,
    }
  },
}

////////
// 🛠️ //
////////

export function needsWriteAccess(query: FileSystemQuery): boolean {
  return query.ability !== "read"
}

//////////////
// ENCODING //
//////////////

export function fromJSON(query: string): Query {
  const obj = JSON.parse(query)

  switch (obj.query) {
    case "account":
      return accountQueryFromJSON(obj)

    case "fileSystem":
      return fileSystemQueryFromJSON(obj)

    default:
      throw new Error("Invalid authority query")
  }
}

function accountQueryFromJSON(obj: Record<string, any>): AccountQuery {
  return {
    query: obj.query,
  }
}

function fileSystemQueryFromJSON(obj: Record<string, any>): FileSystemQuery {
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
      })

    case "fileSystem":
      return JSON.stringify({
        query: query.query,
        ability: query.ability,
        path: Path.toPosix(query.path),
      })
  }
}
