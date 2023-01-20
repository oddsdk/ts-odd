import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import * as Path from "../../src/path/index.js"
import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem", () => {

  it("creates parent directories automatically", async function () {
    const fs = await emptyFilesystem()
    const expected = Uint8arrays.fromString("content", "utf8")

    const privatePath = Path.file("private", "a", "b", "c.txt")
    const publicPath = Path.file("public", "a", "b", "c.txt")

    await fs.write(privatePath, expected)
    await fs.write(publicPath, expected)

    const string = [
      await fs.read(privatePath),
      await fs.read(publicPath)
    ].map(
      a => a ? Uint8arrays.toString(a, "utf8") : ""
    ).join("/")

    expect(string).toEqual("content/content")
  })

})
