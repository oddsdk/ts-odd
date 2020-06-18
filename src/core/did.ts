import * as dns from '../dns'

export const rootDIDForUser = async (
  username: string,
  domain = 'fission.name'
): Promise<string> => {
  try {
    return dns.lookupTxtRecord(`_did.${username}.${domain}`)
  } catch (err) {
    throw new Error("Could not locate user DID in dns")
  }
}
