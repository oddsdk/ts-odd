import * as Path from "./path/index.js"

export type AccessKeyWithContext = {
  did: string
  key: Uint8Array
  path: Path.Distinctive<Path.Segments>
}
