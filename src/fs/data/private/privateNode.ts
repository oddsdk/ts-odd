import CID from "cids"
import * as cbor from "cborg"

import { Metadata } from "../metadata.js"
import { Ref } from "../ref.js"
import * as bloom from "./bloomfilter.js"
import { getCrypto } from "./context.js"
import * as ratchet from "./spiralratchet.js"
import { CborForm } from "../serialization.js"


type PrivateNode = PrivateDirectory | PrivateFile

interface PrivateDirectory {
  metadata: Metadata
  bareName: bloom.BloomFilter
  revision: ratchet.SpiralRatchet
  links: { [path: string]: LazyPrivateStoreRef<PrivateNode> }
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

/** always *saturated* name filters (i.e. a bare namefilter + key from ratchet and then saturated) */
type PrivateStoreName = bloom.BloomFilter

interface PrivateStoreContext {
  getEncryptedBlock(privateStoreName: PrivateStoreName): Promise<Uint8Array | null>
  putEncryptedBlock(privateStoreName: PrivateStoreName, encryptedBlock: Uint8Array): Promise<void>
  hasEncryptedBlock(privateStoreName: PrivateStoreName): Promise<boolean>
}

type PrivateOperationContext = PrivateStoreContext

type LazyPrivateStoreRef<T> = Ref<T, PrivateStoreName, Unlock & PrivateOperationContext>


//--------------------------------------
// Persistence
//--------------------------------------


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

export async function encryptFile(file: PrivateFile): Promise<ArrayBuffer> {
  const { crypto, webcrypto } = getCrypto()
  const serialized = cbor.encode(fileToCborForm(file))
  const key = await webcrypto.importKey(
    "raw",
    await ratchet.toKey(file.revision),
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

export async function storeFile(file: PrivateFile, ctx: PrivateOperationContext): Promise<PrivateStoreName> {
  throw "unimplemented"
}
