import CID from "cids"
import * as cbor from "cborg"

import { Metadata } from "../metadata.js"
import * as bloom from "./bloomfilter.js"
import * as namefilter from "./namefilter.js"
import { getCrypto } from "./context.js"
import * as ratchet from "./spiralratchet.js"
import { CborForm } from "../serialization.js"
import { mapRecordSync } from "../links.js"


type PrivateNode = PrivateDirectory | PrivateFile

interface PrivateDirectory {
  metadata: Metadata
  bareName: bloom.BloomFilter
  revision: ratchet.SpiralRatchet
  links: { [path: string]: Unlock & INumber }
}

interface PrivateFile {
  metadata: Metadata
  bareName: bloom.BloomFilter
  revision: ratchet.SpiralRatchet // so anyone reading this can fetch newer versions
  content: Unlock & { cid: CID }
}

interface Unlock {
  key: ArrayBuffer // 32bit AES key
  // algorithm: "AES-256-GCM" // only supported algorithm right now
}

interface INumber {
  inumber: Uint8Array // length 32
}


export function isPrivateFile(node: PrivateNode): node is PrivateFile {
  return node.metadata.isFile
}

export function isPrivateDirectory(node: PrivateNode): node is PrivateDirectory {
  return !node.metadata.isFile
}


//--------------------------------------
// Persistence
//--------------------------------------


export function nodeToCborForm(node: PrivateNode): CborForm {
  return isPrivateFile(node) ? fileToCborForm(node) : directoryToCborForm(node)
}

export function fileToCborForm(file: PrivateFile): CborForm {
  return {
    metadata: file.metadata,
    bareName: file.bareName,
    revision: ratchet.toCborForm(file.revision),
    content: {
      cid: file.content.cid,
      key: new Uint8Array(file.content.key)
    }
  }
}

export function directoryToCborForm(directory: PrivateDirectory): CborForm {
  return {
    metadata: directory.metadata,
    bareName: directory.bareName,
    revision: ratchet.toCborForm(directory.revision),
    links: mapRecordSync(directory.links, (_, link) => ({
      ...link,
      key: new Uint8Array(link.key)
    }))
  }
}

export async function encryptNode(node: PrivateNode): Promise<ArrayBuffer> {
  const { crypto, webcrypto } = getCrypto()
  const serialized = cbor.encode(nodeToCborForm(node))
  const key = await webcrypto.importKey(
    "raw",
    await ratchet.toKey(node.revision),
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )
  const iv = crypto.getRandomValues(new Uint8Array(16))
  return await webcrypto.encrypt(
    { name: "AES-GCM", iv },
    key,
    serialized
  )
}

export async function privateStoreNameForNode(file: PrivateNode): Promise<bloom.BloomFilter> {
  const key = await ratchet.toKey(file.revision)
  const bareWithKey = await namefilter.addToBare(file.bareName, key)
  return await namefilter.saturate(bareWithKey)
}
