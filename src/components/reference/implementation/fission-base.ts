import type { Dependents, Implementation } from "../implementation.js"
import { Endpoints } from "../../../common/fission.js"

import * as Base from "./base.js"
import * as DataRoot from "./fission/data-root.js"
import * as DID from "./fission/did.js"


// 🛳


export function implementation(endpoints: Endpoints, dependents: Dependents): Implementation {
  const base = Base.implementation(dependents)

  base.dataRoot.domain = (username: string) => `${username}.files.${endpoints.userDomain}`
  base.dataRoot.lookup = (...args) => DataRoot.lookup(endpoints, dependents, ...args)
  base.dataRoot.update = (...args) => DataRoot.update(endpoints, dependents, ...args)
  base.didRoot.lookup = (...args) => DID.root(endpoints, ...args)

  return base
}