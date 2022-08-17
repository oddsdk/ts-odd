import { impl } from "./implementation.js"


export const lookupTxtRecord = async (domain: string): Promise<string | null> => {
  return impl.lookupTxtRecord(domain)
}

export const lookupDnsLink = async (domain: string): Promise<string | null> => {
  return impl.lookupTxtRecord(domain)
}