import { sha256Str } from '../keystore/basic'


export async function bareNameFilter({ path }: { path: string }) {
  return `wnfs__bareNameFilter__${await sha256Str(path)}`
}

export async function readKey({ path }: { path: string }): Promise<string> {
  return `wnfs__readKey__${await sha256Str(path)}`
}
