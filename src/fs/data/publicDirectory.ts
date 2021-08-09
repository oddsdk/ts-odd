import { IpfsPersistence, IpfsRef } from "./ipfsRef.js"
import { Links } from "./links.js"
import { Metadata } from "./metadata.js"

export interface PublicDirectory {
  previous: IpfsRef<PublicDirectory>
  metadata: IpfsRef<Metadata>
  userland: Links<PublicDirectory>
}

export interface PublicFileSystem {
  previous: IpfsRef<PublicFileSystem>
  metadata: IpfsRef<Metadata>
}
