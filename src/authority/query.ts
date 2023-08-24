import { isString } from "../common/type-checks.js"
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

export type FileSystemAbility = typeof ALLOWED_FILE_SYSTEM_ABILITIES[number]

export type FileSystemQuery = {
  query: "fileSystem"
  ability: FileSystemAbility
  did: string
  path: Path.Distinctive<Path.Partitioned<Path.Partition>>
}

////////
// 🏔️️ //
////////

export const account: AccountQuery = {
  query: "account",
}

export const fileSystem = {
  rootAccess(did: string): FileSystemQuery[] {
    return [{
      query: "fileSystem",
      ability: "*",
      did,
      path: Path.directory("public"),
    }, {
      query: "fileSystem",
      ability: "*",
      did,
      path: Path.directory("private"),
    }]
  },
  limitedAccess(
    ability: typeof ALLOWED_FILE_SYSTEM_ABILITIES[number],
    did: string,
    path: Path.Distinctive<Path.Partitioned<Path.Partition>>
  ): FileSystemQuery {
    return {
      query: "fileSystem",
      did,
      ability,
      path,
    }
  },
}

////////
// 🛠️ //
////////

export function isContained({ parent, child }: { parent: Query; child: Query }): boolean {
  if (parent.query === "account") return child.query === "account"

  // File System
  if (parent.query === "fileSystem") {
    if (child.query !== "fileSystem") return false

    const ability = parent.ability === "*"
      ? true
      : (child.ability === "*" ? false : parent.ability === child.ability)

    const did = parent.did === child.did

    const unwrappedParentPath = Path.unwrap(parent.path)
    const path = Path.unwrap(child.path).reduce(
      (acc, part, idx) => {
        if (!acc) return acc
        if (idx + 1 > unwrappedParentPath.length) return true
        return part === unwrappedParentPath[idx]
      },
      true
    )

    return ability && did && path
  }

  // ?
  return false
}

export function needsWriteAccess(query: FileSystemQuery): boolean {
  return query.ability !== "read"
}

//////////////
// ENCODING //
//////////////

export function fromJSON(query: string | Record<string, any>): Query {
  const obj = isString(query) ? JSON.parse(query) : query

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

function fileSystemQueryFromJSON(obj: Record<string, unknown>): FileSystemQuery {
  if (ALLOWED_FILE_SYSTEM_ABILITIES.includes(obj.ability as FileSystemAbility) === false) {
    throw new Error(`Ability in file-system query is not allowed: \`${obj.ability}\``)
  }

  const path = Path.fromPosix(obj.path as string)
  let partitionedPath: Path.Distinctive<Path.Partitioned<Path.Partition>>

  if (Path.isPartitioned(path)) {
    partitionedPath = path
  } else {
    throw new Error(`Expected a path with a partition (private or public), got: ${obj.path}`)
  }

  if (!isString(obj.did)) {
    throw new Error("Expected a `did` property")
  }

  return {
    query: "fileSystem",
    ability: obj.ability as FileSystemAbility,
    did: obj.did,
    path: partitionedPath,
  }
}

export function toJSON(query: Query): object {
  switch (query.query) {
    case "account":
      return {
        query: query.query,
      }

    case "fileSystem":
      return {
        query: query.query,
        ability: query.ability,
        did: query.did,
        path: Path.toPosix(query.path),
      }
  }
}
