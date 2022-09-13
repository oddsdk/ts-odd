import { CID } from "multiformats/cid"

import * as Crypto from "../crypto/implementation.js"
import * as Manners from "../manners/implementation.js"
import * as Storage from "../storage/implementation.js"

import { Ucan } from "../../ucan/types.js"
import Repository from "../../repository.js"


export type Dependents = {
  crypto: Crypto.Implementation
  manners: Manners.Implementation
  storage: Storage.Implementation
}


export type Implementation = {
  dataRoot: {
    lookup: (username: string) => Promise<CID | null>
    update: (cid: CID, proof: Ucan) => Promise<{ success: boolean }>
  }
  didRoot: {
    lookup: (username: string) => Promise<string>
    // TODO: update
  }
  dns: {
    lookupDnsLink: (domain: string) => Promise<string | null>
    lookupTxtRecord: (domain: string) => Promise<string | null>
  }
  repositories: {
    cidLog: Repository<CID>
    ucans: Repository<Ucan>
  }
}