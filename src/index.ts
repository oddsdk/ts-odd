import * as auth from './auth'
import * as dataRoot from './data-root'

import * as did from './did'
import * as dns from './dns'
import * as ipfs from './ipfs'
import * as keystore from './keystore'
import * as lobby from './lobby'
import * as setup from './setup'
import * as ucan from './ucan'

import fs from './fs'


export default {
  ...auth,
  ...dataRoot,

  // Modularised
  fs,
  did,
  lobby,
  setup,
  ucan,

  // Basement
  dns,
  ipfs,
  keystore,
}
