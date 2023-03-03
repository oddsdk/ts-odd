import { PrivateDirectory, PrivateForest, PrivateNode, PublicDirectory } from "wnfs"
import * as Path from "../../path/index.js"


export type MountedPrivateNodes = Record<
  string, MountedPrivateNode
>

export type MountedPrivateNode = {
  node: PrivateNode
  path: Path.Distinctive<Path.Segments>
}

export type PrivateNodeQueryResult = MountedPrivateNode & {
  remainder: Path.Segments
}

export type WnfsPrivateResult = { rootDir: PrivateDirectory, forest: PrivateForest }
export type WnfsPublicResult = { rootDir: PublicDirectory }