import * as Crypto from "../components/crypto/implementation.js"
import * as Identifiers from "./identifiers.js"
import * as Path from "../path/index.js"


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



// ㊙️


function identifier(crypto: Crypto.Implementation, accountDID: string): Promise<string> {
  const path = Path.directory(Path.Branch.Private)
  return Identifiers.readKey({ crypto, path, accountDID })
}