import expect from "expect"
import { crypto } from "../helpers/components.js"
import { emptyFilesystem } from "../helpers/filesystem.js"

import { addPublicExchangeKey, hasPublicExchangeKey } from "../../src/fs/data.js"


describe("the filesystem", () => {

  it("adds public exchange key to well-known location", async function () {
    const fs = await emptyFilesystem()
    await addPublicExchangeKey(crypto, fs)
    const exists = await hasPublicExchangeKey(crypto, fs)

    expect(exists).toEqual(true)
  })

})
