import type { IPFS } from "ipfs-core-types"
import * as mocha from "mocha"

import { createInMemoryIPFS } from "./helpers/in-memory-ipfs.js"
import * as ipfsConfig from "../src/ipfs/config.js"

declare module "mocha" {
  export interface Context {
    ipfs: IPFS
  }
}

export const mochaHooks = {

  // All

  beforeAll: async function (this: mocha.Context) {
    this.ipfs = await createInMemoryIPFS()
    ipfsConfig.set(this.ipfs)
  },

  afterAll: async function (this: mocha.Context) {
    if (this.ipfs != null) await this.ipfs.stop()
  },

  // Each

  // beforeEach: async function(this: mocha.Context) {
  // },

  afterEach: async function (this: mocha.Context) {
    if (this.page != null) {
      await this.page.close()
    }
  },

}

function errorContext(functionName: string) {
  return `Called "${functionName}" without a mocha test context. Make sure to run your tests as "it(..., async function(){}" and to provide "this": "${functionName}(this)"`
}

export const ipfsFromContext = (that: mocha.Context): IPFS => {
  const ipfs = that?.test?.ctx?.ipfs
  if (ipfs == null) {
    throw new Error(errorContext("ipfsFromContext"))
  }
  return ipfs
}
