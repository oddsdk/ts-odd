import expect from "expect"

import * as path from "../../src/path.js"
import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem", () => {

  it("creates parent directories automatically", async function() {
    const fs = await emptyFilesystem()
    const expected = "content"

    const privatePath = path.file(path.Branch.Private, "a", "b", "c.txt")
    const publicPath = path.file(path.Branch.Public, "a", "b", "c.txt")

    await fs.write(privatePath, expected)
    await fs.write(publicPath, expected)

    const string = [
      await fs.read(privatePath),
      await fs.read(publicPath).then(a => a ? new TextDecoder().decode(a as any) : "")
    ].join("/")

    expect(string).toEqual("content/content")
  })

})
