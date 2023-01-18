import * as Uint8Arrays from "uint8arrays"

import { DistinctivePath } from "../path/index.js"

import * as Crypto from "../components/crypto/implementation.js"
import * as Path from "../path/index.js"


type Arguments = {
  crypto: Crypto.Implementation
  accountDID: string
  path: DistinctivePath<Path.Segments>
}


export async function bareNameFilter(
  { crypto, accountDID, path }: Arguments
): Promise<string> {
  return `wnfs:${accountDID}:bareNameFilter:${await pathHash(crypto, path)}`
}

export async function readKey(
  { crypto, accountDID, path }: Arguments
): Promise<string> {
  return `wnfs:${accountDID}:readKey:${await pathHash(crypto, path)}`
}



// 🛠


async function pathHash(crypto: Crypto.Implementation, path: DistinctivePath<Path.Segments>): Promise<string> {
  return Uint8Arrays.toString(
    await crypto.hash.sha256(
      Uint8Arrays.fromString("/" + Path.unwrap(path).join("/"), "utf8")
    ),
    "base64pad"
  )
}
