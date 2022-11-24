import { CID } from "multiformats/cid"

import * as CIDLog from "../../repositories/cid-log.js"
import * as Ucans from "../../repositories/ucans.js"

import { Ucan } from "../../ucan/types.js"


export type Implementation = {
  dataRoot: {
    domain: (username: string) => string // DNSLink domain
    lookup: (username: string) => Promise<CID | null>
    update: (cid: CID, proof: Ucan) => Promise<{ success: boolean }>
  }
  didRoot: {
    lookup: (username: string) => Promise<string>
  }
  dns: {
    lookupDnsLink: (domain: string) => Promise<string | null>
    lookupTxtRecord: (domain: string) => Promise<string | null>
  }
  repositories: {
    cidLog: CIDLog.Repo
    ucans: Ucans.Repo
  }
}