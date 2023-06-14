export type Implementation = {
  lookupDnsLink: (domain: string) => Promise<string | null>
  lookupTxtRecord: (domain: string) => Promise<string | null>
}