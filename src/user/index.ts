import ipfs, { CID } from '../ipfs'

export const fileRoot = async(username: string): Promise<CID> => {
  try {
    const result = await ipfs.dns(`files.${username}.fission.name`)
    return result.replace(/^\/ipfs\//, "")
  } catch(err) {
    throw new Error("Could not locate user root in dns")
  }
}

export default {
  fileRoot
}
