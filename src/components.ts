import * as Auth from "./components/auth/implementation.js"
import * as Confidences from "./components/confidences/implementation.js"
import * as Crypto from "./components/crypto/implementation.js"
import * as Depot from "./components/depot/implementation.js"
import * as Manners from "./components/manners/implementation.js"
import * as Reference from "./components/reference/implementation.js"
import * as Storage from "./components/storage/implementation.js"


// COMPONENTS


export type Components = {
  auth: Auth.Implementation<Components>[]
  confidences: Confidences.Implementation
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation
  storage: Storage.Implementation
}