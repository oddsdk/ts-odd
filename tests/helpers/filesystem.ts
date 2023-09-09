import * as DagPB from "@ipld/dag-pb"
import { strict as assert } from "assert"
import * as fc from "fast-check"
import * as UnixExporter from "ipfs-unixfs-exporter"
import all from "it-all"
import * as Uint8Arrays from "uint8arrays"

import { Depot } from "../../src/components.js"
import { FileSystem } from "../../src/fs/class.js"
import { linksFromCID } from "../../src/fs/rootTree.js"
import * as Path from "../../src/path/index.js"

// PATHS

export function arbitraryDirectoryPath<P extends Path.Partition>(
  partition: P
): fc.Arbitrary<Path.Directory<Path.PartitionedNonEmpty<P>>> {
  return fc
    .array(arbitraryPathSegment(), { minLength: 1, maxLength: 8 })
    .map(array => ({ directory: [partition, ...array] }) as Path.Directory<Path.PartitionedNonEmpty<P>>)
}

export function arbitraryFilePath<P extends Path.Partition>(
  partition: P
): fc.Arbitrary<Path.File<Path.PartitionedNonEmpty<P>>> {
  return fc
    .array(arbitraryPathSegment(), { minLength: 1, maxLength: 8 })
    .map(array => ({ file: [partition, ...array] }) as Path.File<Path.PartitionedNonEmpty<P>>)
}

export function arbitraryPathSegment(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.webSegment().filter(segment => segment.length > 0),
    fc.constantFrom("a", "b", "c") // to generate more 'collisions'
  )
}

// UNIX

export async function assertUnixFsDirectory(
  opts: { dependencies: { depot: Depot.Implementation } },
  fs: FileSystem,
  path: Path.Directory<Path.Partitioned<Path.Public>>
) {
  const { depot } = opts.dependencies
  const dataRoot = await fs.calculateDataRoot()

  const rootTree = await linksFromCID(depot, dataRoot)
  const unixRoot = rootTree["unix"]

  const pathString = Path.toPosix(Path.removePartition(path), { absolute: true })
  const entry = await UnixExporter.exporter(`${unixRoot}${pathString}`, depot.blockstore)

  return assert.equal(
    entry.type,
    "directory"
  )
}

export async function assertUnixFsFile(
  opts: { dependencies: { depot: Depot.Implementation } },
  fs: FileSystem,
  path: Path.File<Path.Partitioned<Path.Public>>,
  bytes: Uint8Array
) {
  const { depot } = opts.dependencies
  const dataRoot = await fs.calculateDataRoot()

  const rootTree = await linksFromCID(depot, dataRoot)
  const unixRoot = rootTree["unix"]

  const pathString = Path.toPosix(Path.removePartition(path), { absolute: true })
  const entry = await UnixExporter.exporter(`${unixRoot}${pathString}`, depot.blockstore)
  const unixBytes = Uint8Arrays.concat(await all(entry.content()))

  return assert.equal(
    Uint8Arrays.equals(unixBytes as Uint8Array, bytes),
    true
  )
}

export async function assertUnixNodeRemoval(
  opts: { dependencies: { depot: Depot.Implementation } },
  fs: FileSystem,
  path: Path.Distinctive<Path.Partitioned<Path.Public>>
) {
  const { depot } = opts.dependencies
  const dataRoot = await fs.calculateDataRoot()

  const rootTree = await linksFromCID(depot, dataRoot)
  const unixRoot = rootTree["unix"]

  const pathString = Path.toPosix(Path.removePartition(path), { absolute: true })

  try {
    const entry = await UnixExporter.exporter(`${unixRoot}${pathString}`, depot.blockstore)
  } catch (err) {
    assert((err as Error).toString(), "File does not exist")
  }
}
