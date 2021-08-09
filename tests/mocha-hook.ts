import * as mocha from "mocha"
import puppeteer from "puppeteer"
import { IPFS } from "ipfs-core"
import { createInMemoryIPFS } from "./helpers/in-memory-ipfs.js"
import * as ipfsConfig from "../src/ipfs/config.js"

declare module "mocha" {
  export interface Context {
    browser: puppeteer.Browser
    page?: puppeteer.Page
    ipfs: IPFS
  }
}

export const mochaHooks = {

  // All

  beforeAll: async function(this: mocha.Context) {
    this.browser = await puppeteer.launch()
    this.ipfs = await createInMemoryIPFS()
    ipfsConfig.set(this.ipfs)
  },

  afterAll: async function(this: mocha.Context) {
    if (this.browser != null) await this.browser.close()
    if (this.ipfs != null) await this.ipfs.stop()
  },

  // Each

  // beforeEach: async function(this: mocha.Context) {
  // },

  afterEach: async function(this: mocha.Context) {
    if (this.page != null) {
      await this.page.close()
    }
  },

}

function errorContext(functionName: string) {
  return `Called "${functionName}" without a mocha test context. Make sure to run your tests as "it(..., async function(){}" and to provide "this": "${functionName}(this)"`
}

export const browserFromContext = (that: mocha.Context): puppeteer.Browser => {
  const browser = that?.test?.ctx?.browser
  if (browser == null) {
    throw new Error(errorContext("browserFromContext"))
  }
  return browser
}

export const pageFromContext = async (that: mocha.Context): Promise<puppeteer.Page> => {
  const browser = browserFromContext(that)
  const page = await browser.newPage()
  const ctx = that?.test?.ctx
  if (ctx == null) {
    throw new Error(errorContext("pageFromContext"))
  }
  ctx.page = page
  return page
}

export const ipfsFromContext = (that: mocha.Context): IPFS => {
  const ipfs = that?.test?.ctx?.ipfs
  if (ipfs == null) {
    throw new Error(errorContext("ipfsFromContext"))
  }
  return ipfs
}
