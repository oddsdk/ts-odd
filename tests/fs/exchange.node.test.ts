import expect from "expect"

import "../../src/setup/node.js"

import { EXCHANGE_PATH } from "../../src/fs/share.js"
import { emptyFilesystem } from "../helpers/filesystem.js"

import * as did from "../../src/did/index.js"
import * as path from "../../src/path.js"


describe("the filesystem", () => {

  it("adds public exchange key to well-known location", async function() {
    const fs = await emptyFilesystem()
    await fs.addPublicExchangeKey()
    const exists = await fs.hasPublicExchangeKey()

    expect(exists).toEqual(true)
  })

})
