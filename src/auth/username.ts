import * as crypto from "../crypto/index.js"
import { impl as auth } from "./implementation.js"

export const toInternalUsername = async (username: string): Promise<string> => {
  const { username: uname, hash } = auth.transformUsername(username)

  if (hash) {
    return await crypto.sha256Str(uname)
  } else {
    return uname
  }
}