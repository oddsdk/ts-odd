import * as crypto from "../crypto/index.js"
import { impl as auth } from "./implementation.js"

export const toGlobalUsername = async (username: string): Promise<string> => {
  const { username: uname, hash } = auth.transformUsername(username)

  const normalizedUsername = uname.normalize("NFC")

  if (hash) {
    return (await crypto.sha256Str(normalizedUsername)).slice(0, 32)
  } else {
    return uname
  }
}