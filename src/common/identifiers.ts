import { DistinctivePath } from '../path'
import { sha256Str } from '../keystore/basic'

import * as pathing from '../path'


export async function bareNameFilter({ path }: { path: DistinctivePath }) {
  const hash = await sha256Str(pathing.toPosix(path))
  return `wnfs__bareNameFilter__${hash}`
}

export async function readKey({ path }: { path: DistinctivePath }): Promise<string> {
  const hash = await sha256Str(pathing.toPosix(path))
  return `wnfs__readKey__${hash}`
}
