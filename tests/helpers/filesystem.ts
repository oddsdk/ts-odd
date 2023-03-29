import * as fc from "fast-check"

import * as Path from "../../src/path/index.js"


// PATHS


export function arbitraryDirectoryPath<P extends Path.Partition>(partition: P): fc.Arbitrary<Path.Directory<Path.PartitionedNonEmpty<P>>> {
  return fc
    .array(arbitraryPathSegment(), { minLength: 1, maxLength: 8 })
    .map(array => ({ directory: [ partition, ...array ] }) as Path.Directory<Path.PartitionedNonEmpty<P>>)
}


export function arbitraryFilePath<P extends Path.Partition>(partition: P): fc.Arbitrary<Path.File<Path.PartitionedNonEmpty<P>>> {
  return fc
    .array(arbitraryPathSegment(), { minLength: 1, maxLength: 8 })
    .map(array => ({ file: [ partition, ...array ] }) as Path.File<Path.PartitionedNonEmpty<P>>)
}


export function arbitraryPathSegment(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.webSegment().filter(segment => segment.length > 0),
    fc.constantFrom("a", "b", "c") // to generate more 'collisions'
  )
}