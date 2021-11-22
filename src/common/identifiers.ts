import * as uint8arrays from "uint8arrays"

import { DistinctivePath } from "../path.js"
import * as crypto from "../crypto/index.js"

import * as pathing from "../path.js"


export async function bareNameFilter({ path }: { path: DistinctivePath }): Promise<string> {
  const hash = await crypto.hash.sha256Str(pathToString(path))
  return `wnfs__bareNameFilter__${hash}`
}

export async function readKey({ path }: { path: DistinctivePath }): Promise<string> {
  const hash = await crypto.hash.sha256Str(pathToString(path))
  return `wnfs__readKey__${hash}`
}

export async function ratchet({ bareName }: { bareName: Uint8Array }): Promise<string> {
  const hash = await crypto.hash.sha256Str(uint8arrays.toString(bareName, "base64"))
  return `wnfs__ratchet__${hash}`
}


/**
 * This bit needs to backwards compatible.
 *
 * In webnative version < 0.24, we used to have `readKey({ path: "/private" })`
 * for the private root tree (aka. directory).
 */
function pathToString(path: DistinctivePath) {
  return "/" + pathing.unwrap(path).join("/")
}
