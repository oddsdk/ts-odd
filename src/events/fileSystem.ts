import { CID } from "../common/cid.js"
import { MutationType } from "../fs/types.js"
import { DistinctivePath, Partition, Partitioned } from "../path/index.js"
import { Ucan } from "../ucan/types.js"

export type FileSystem = {
  "local-change": { dataRoot: CID; path: DistinctivePath<Partitioned<Partition>>; type: MutationType }
  "publish": { dataRoot: CID; proofs: Ucan[] }
}
