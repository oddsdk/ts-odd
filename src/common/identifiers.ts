import { DistinctivePath } from '../path'
import { sha256Str } from '../keystore/basic'

import * as pathing from '../path'


export async function bareNameFilter({ path }: { path: DistinctivePath }) {
  const hash = await sha256Str(pathToString(path))
  return `wnfs__bareNameFilter__${hash}`
}

export async function readKey({ path }: { path: DistinctivePath }): Promise<string> {
  const hash = await sha256Str(pathToString(path))
  return `wnfs__readKey__${hash}`
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
