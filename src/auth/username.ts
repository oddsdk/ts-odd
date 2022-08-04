import * as crypto from "../crypto/index.js"
import { transformUsername } from "./internal.js"

export const toInternalUsername = async (username: string): Promise<string> => {
  const { username: uname, hash } = transformUsername(username)

  if (hash) {
    return await crypto.sha256Str(uname)
  } else {
    return uname
  }
}