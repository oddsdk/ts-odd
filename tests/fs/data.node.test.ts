import expect from "expect"

import * as FsData from "../../src/fs/data.js"
import * as Path from "../../src/path/index.js"
import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem", () => {

  it("adds sample data", async function () {
    const fs = await emptyFilesystem()

    await FsData.addSampleData(fs)

    expect(
      await fs.exists(
        Path.file("private", "Welcome.txt")
      )
    ).toBe(true)
  })

})