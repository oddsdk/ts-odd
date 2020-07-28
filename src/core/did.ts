import * as dns from '../dns'

export const rootDidForUser = async (
  username: string,
  domain = 'fission.name'
): Promise<string> => {
  try {
    const maybeDid = await dns.lookupTxtRecord(`_did.${username}.${domain}`)
    if(maybeDid !== null) return maybeDid
  } catch (_err) { 
    // throw error below
  }
  throw new Error("Could not locate user DID in dns")
}
