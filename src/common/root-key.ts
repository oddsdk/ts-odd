import * as Uint8arrays from "uint8arrays"

import * as Crypto from "../components/crypto/implementation.js"
import * as Identifiers from "./identifiers.js"
import * as Path from "../path/index.js"


// STORAGE


export async function exists({ crypto, accountDID }: {
  crypto: Crypto.Implementation
  accountDID: string
}): Promise<boolean> {
  const rootKeyId = await identifier(crypto, accountDID)
  return crypto.keystore.keyExists(rootKeyId)
}


export async function retrieve({ crypto, accountDID }: {
  crypto: Crypto.Implementation
  accountDID: string
}): Promise<Uint8Array> {
  const rootKeyId = await identifier(crypto, accountDID)
  return crypto.keystore.exportSymmKey(rootKeyId)
}


export async function store({ crypto, accountDID, readKey }: {
  crypto: Crypto.Implementation
  readKey: Uint8Array
  accountDID: string
}): Promise<void> {
  const rootKeyId = await identifier(crypto, accountDID)
  return crypto.keystore.importSymmKey(readKey, rootKeyId)
}



// ENCODING


export function fromString(a: string): Uint8Array {
  return Uint8arrays.fromString(a, "base64pad")
}


export function toString(a: Uint8Array): string {
  return Uint8arrays.toString(a, "base64pad")
}



// ㊙️


function identifier(crypto: Crypto.Implementation, accountDID: string): Promise<string> {
  const path = Path.directory(Path.RootBranch.Private)
  return Identifiers.readKey({ crypto, path, accountDID })
}