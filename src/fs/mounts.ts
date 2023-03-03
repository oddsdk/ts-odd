import * as Path from "../path/index.js"
import { MountedPrivateNodes, PrivateNodeQueryResult } from "./types/internal.js"
import { Partition, Partitioned, PartitionedNonEmpty } from "../path/index.js"
import { PartitionDiscovery, PartitionDiscoveryNonEmpty } from "./types.js"
import { throwInvalidPartition, throwNoAccess } from "./errors.js"


/**
   * Find a private node based on a given path.
   * Throws if it cannot find a node.
   *
   * This looks in the `privateNodes` record using the POSIX path as the key.
   * A directory will end with a forward slash and a file will not.
   *
   * Starts from the path `/` and works up to given path,
   * which could be a file or directory path.
   */
export function findPrivateNode(
  path: Path.Distinctive<Partitioned<Path.Private>>,
  privateNodes: MountedPrivateNodes
): PrivateNodeQueryResult {
  const pathKind = Path.kind(path)
  const pathWithoutPartition = Path.removePartition(path)
  const pathSegments = Path.unwrap(pathWithoutPartition)

  for (let i = 0; i <= pathSegments.length; i++) {
    const path = Path.fromKind(
      i === pathSegments.length ? pathKind : Path.Kind.Directory,
      ...pathSegments.slice(0, i)
    )

    const result = privateNodes[ Path.toPosix(path, { absolute: true }) ]

    if (result) return {
      ...result,
      remainder: pathSegments.slice(i),
    }
  }

  throwNoAccess(path)
}


export function partition<P extends Partition>(
  path: Path.Distinctive<PartitionedNonEmpty<P>>
): PartitionDiscoveryNonEmpty<P>
export function partition<P extends Partition>(
  path: Path.Distinctive<Partitioned<P>>
): PartitionDiscovery<P>
export function partition(
  path: Path.Distinctive<Partitioned<Partition>>
): {
  name: "public" | "private",
  path: Path.Distinctive<Partitioned<Partition>>,
  segments: Path.Segments
} {
  const unwrapped = Path.unwrap(path)
  const rest = unwrapped.slice(1)

  switch (unwrapped[ 0 ]) {
    case "public": return { name: "public", path: path, segments: rest }
    case "private": return { name: "private", path: path, segments: rest }
    default: throwInvalidPartition(path)
  }
}