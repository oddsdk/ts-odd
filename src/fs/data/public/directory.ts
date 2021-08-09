import { CID } from "ipfs-core"
import { PersistenceOptions } from "../ipfsRef.js"
import { toCID as linksToCID, fromCID as linksFromCID, Links, Link } from "../links.js"
import { toCID as metadataToCID, fromCID as metadataFromCID, Metadata } from "../metadata.js"
import { PublicFile } from "./file.js"

export interface PublicDirectory {
  previous: Link<PublicDirectory> | null
  skeleton: Link<Uint8Array>
  metadata: {
    // name: "metadata"
    data: Metadata
    size: number
  }
  userland: {
    // name: "userland"
    data: Links<PublicDirectory | PublicFile>
    size: number
  }
}

export async function toCID(dir: PublicDirectory, options: PersistenceOptions): Promise<CID> {
  const userlandCID = await linksToCID(dir.userland.data, options)
  const metadataCID = await metadataToCID(dir.metadata.data, options)
  const dirLinks: Links<unknown> = {
    skeleton: dir.skeleton,
    metadata: {
      name: "metadata",
      size: dir.metadata.size,
      cid: metadataCID,
    },
    userland: {
      name: "userland",
      size: dir.userland.size,
      cid: userlandCID,
    },
  }
  if (dir.previous != null) {
    dirLinks.previous = dir.previous
  }
  return await linksToCID(dirLinks, options)
}

export async function fromCID(cid: CID, options: PersistenceOptions): Promise<PublicDirectory> {
  const dirLinks = await linksFromCID(cid, options)
  if (dirLinks.metadata == null) throw new Error(`Missing link "metadata" for PublicDirectory at ${cid.toString()}`)
  if (dirLinks.userland == null) throw new Error(`Missing link "userland" for PublicDirectory at ${cid.toString()}`)
  if (dirLinks.skeleton == null) throw new Error(`Missing link "skeleton" for PublicDirectory at ${cid.toString()}`)
  const metadata = await metadataFromCID(dirLinks.metadata.cid, options)
  const userlandLinks = await linksFromCID(dirLinks.userland.cid, options)
  return {
    previous: dirLinks.previous || null,
    skeleton: dirLinks.skeleton,
    metadata: {
      data: metadata,
      size: dirLinks.metadata.size
    },
    userland: {
      data: userlandLinks,
      size: dirLinks.userland.size
    },
  }
}
