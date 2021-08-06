import { IpfsRef } from "./ipfsRef.js"
import { Metadata } from "./metadata.js"

export interface FileSystem {
  public: PublicFileSystem
  private: MMPT
  privateLog: PrivateLog
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MMPT {
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PrivateLog {}

export interface PublicFileSystem {
  previous: IpfsRef<PublicFileSystem>
  metadata: IpfsRef<Metadata>
}
