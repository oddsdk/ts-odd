export type Implementation = {
  lookupTxtRecord: (domain: string) => Promise<string | null> 
  lookupDnsLink: (domain: string) => Promise<string | null>
}