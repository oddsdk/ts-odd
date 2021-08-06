import { IpfsPersistence, IpfsRef } from "./ipfsRef.js"
import { Metadata } from "./metadata.js"

export interface PublicDirectory {
  previous: IpfsRef<PublicDirectory>
  metadata: IpfsRef<Metadata>
  userland: { [key: string]: Link }
}

export interface PublicFileSystem {
  previous: IpfsRef<PublicFileSystem>
  metadata: IpfsRef<Metadata>
}
