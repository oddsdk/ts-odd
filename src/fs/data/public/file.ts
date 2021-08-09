import type { CID } from "ipfs-core"
import { PersistenceOptions } from "../ipfsRef.js"
import { toCID as metadataToCID, fromCID as metadataFromCID, Metadata } from "../metadata.js"
import * as links from "../links.js"


export interface PublicFile {
  metadata: {
    data: Metadata
    size: number
  }
  previous: links.Link<PublicFile> | null
  userland: links.Link<Uint8Array>
}


export async function fromCID(cid: CID, options: PersistenceOptions): Promise<PublicFile> {
  // TODO Check metadata for type file
  const dagLinks = await links.fromCID(cid, options)
  if (dagLinks.metadata == null) throw new Error(`Missing link "metadata" for PublicFile at ${cid.toString()}`)
  if (dagLinks.userland == null) throw new Error(`Missing link "userland" for PublicFile at ${cid.toString()}`)

  const metadata = await metadataFromCID(dagLinks.metadata.cid, options)
  
  return {
    metadata: {
      data: metadata,
      size: dagLinks.metadata.size,
    },
    previous: dagLinks.previous || null,
    userland: dagLinks.userland,
  }
}

export async function toCID(file: PublicFile, options: PersistenceOptions): Promise<CID> {
  const metadataCID = await metadataToCID(file.metadata.data, options)
  if (file.previous == null) {
    return await links.toCID({
      metadata: {
        name: "metadata",
        size: file.metadata.size,
        cid: metadataCID,
      },
      userland: file.userland,
    }, options)
  }
  return await links.toCID({
    metadata: {
      name: "metadata",
      size: file.metadata.size,
      cid: metadataCID,
    },
    previous: file.previous,
    userland: file.userland,
  }, options)
}

