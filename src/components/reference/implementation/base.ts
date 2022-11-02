import { Dependents, Implementation } from "../implementation"

import * as CIDLogRepo from "../../../repositories/cid-log.js"
import * as UcansRepo from "../../../repositories/ucans.js"

import * as DOH from "../dns-over-https.js"



// 🛳


export function implementation(dependents: Dependents): Implementation {
  return {
    dataRoot: {
      domain: () => { throw new Error("Not implemented") },
      lookup: () => { throw new Error("Not implemented") },
      update: () => { throw new Error("Not implemented") }
    },
    didRoot: {
      lookup: () => { throw new Error("Not implemented") }
    },
    dns: {
      lookupDnsLink: DOH.lookupDnsLink,
      lookupTxtRecord: DOH.lookupTxtRecord,
    },
    repositories: {
      cidLog: CIDLogRepo.create({ storage: dependents.storage }),
      ucans: UcansRepo.create({ storage: dependents.storage })
    },
  }
}