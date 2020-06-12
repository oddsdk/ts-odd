import * as auth from './auth'
import * as dataRoot from './data-root'

import * as core from './core'
import * as dns from './dns'
import * as ipfs from './ipfs'
import * as keystore from './keystore'
import * as lobby from './lobby'
import fs from './fs'


export default {
  ...auth,
  ...dataRoot,

  // Modularised
  core,
  fs,
  lobby,

  // Basement
  dns,
  ipfs,
  keystore,
}
