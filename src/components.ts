import * as Auth from "./components/auth/implementation.js"
import * as Capabilities from "./components/capabilities/implementation.js"
import * as Crypto from "./components/crypto/implementation.js"
import * as Depot from "./components/depot/implementation.js"
import * as Manners from "./components/manners/implementation.js"
import * as Reference from "./components/reference/implementation.js"
import * as Storage from "./components/storage/implementation.js"


// COMPONENTS


export type Components = {
  auth: Auth.Implementation<Components>
  capabilities: Capabilities.Implementation
  crypto: Crypto.Implementation
  depot: Depot.Implementation
  manners: Manners.Implementation
  reference: Reference.Implementation
  storage: Storage.Implementation
}



// CONVENIENCE EXPORTS


export { Auth, Capabilities, Crypto, Depot, Manners, Reference, Storage }