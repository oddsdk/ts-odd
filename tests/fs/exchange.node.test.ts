import expect from "expect"
import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem", () => {

  it("adds public exchange key to well-known location", async function () {
    const fs = await emptyFilesystem()
    await fs.addPublicExchangeKey()
    const exists = await fs.hasPublicExchangeKey()

    expect(exists).toEqual(true)
  })

})
