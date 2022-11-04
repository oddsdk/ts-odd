import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import * as Path from "../../src/path/index.js"
import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem", () => {

  it("provides an appPath", async function () {
    const fs = await emptyFilesystem()
    const content = Uint8arrays.fromString("bar", "utf8")

    if (!fs.appPath) throw new Error("Expected `fs` to have a `appPath` function")

    await fs.mkdir(fs.appPath())
    await fs.write(fs.appPath(Path.file("foo")), content)

    const data = await fs.read(fs.appPath(Path.file("foo")))

    expect(
      data && Uint8arrays.toString(data, "utf8")
    ).toEqual(
      "bar"
    )
  })

})
