import * as Path from "../path/index.js"

////////
// 🛠️ //
////////

export function addOrIncreaseNameNumber(
  path: Path.Directory<Path.PartitionedNonEmpty<Path.Partition>>,
): Path.Directory<Path.PartitionedNonEmpty<Path.Partition>>
export function addOrIncreaseNameNumber(
  path: Path.File<Path.PartitionedNonEmpty<Path.Partition>>,
): Path.File<Path.PartitionedNonEmpty<Path.Partition>>
export function addOrIncreaseNameNumber(
  path: Path.Distinctive<Path.PartitionedNonEmpty<Path.Partition>>,
): Path.Distinctive<Path.PartitionedNonEmpty<Path.Partition>> {
  const regex = Path.isFile(path) ? (/(\ \((\d+)\))?(\.[^$]+)?$/) : (/(\ \((\d+)\))$/)
  const terminus = Path.terminus(path)
  const suffixMatches = terminus.match(regex)

  return Path.replaceTerminus(
    path,
    suffixMatches
      ? terminus.replace(regex, ` (${parseInt(suffixMatches[2] || "0", 10) + 1})${suffixMatches[3] || ""}`)
      : `${terminus} (1)${suffixMatches ? suffixMatches[3] || "" : ""}`,
  )
}

export function pathSegmentsWithoutPartition(path: Path.Distinctive<Path.Partitioned<Path.Partition>>) {
  return Path.unwrap(
    Path.removePartition(path),
  )
}

/**
 * Which `searchLatest` value to use for the private file system actions.
 */
export function searchLatest(): boolean {
  return true
}
