import expect from "expect"
import * as mocha from "mocha"
import puppeteer from "puppeteer"

declare module "mocha" {
  export interface Context {
    browser: puppeteer.Browser
    page: puppeteer.Page
  }
}

export const mochaHooks = {

  // All

  beforeAll: async function(this: mocha.Context) {
    this.browser = await puppeteer.launch()
  },

  afterAll: async function(this: mocha.Context) {
    await this.browser.close()
  },

  // Each

  beforeEach: async function(this: mocha.Context) {
    this.page = await this.browser.newPage()
  },

  afterEach: async function(this: mocha.Context) {
    await this.page.close()
  },

}

export const pageFromContext = (that: mocha.Context): puppeteer.Page => {
  const page = that?.test?.ctx?.page
  if (page == null) {
    expect(page).not.toBe(null)
  }
  return page as unknown as puppeteer.Page
}
