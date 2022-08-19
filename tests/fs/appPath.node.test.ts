import expect from "expect"

import * as path from "../../src/path.js"
import FileSystem from "../../src/fs/filesystem.js"

describe("the filesystem", () => {

  it("provides an appPath", async function() {
    const fs = await FileSystem.empty({
      localOnly: true,
      permissions: {
        app: {
          name: "Winamp",
          creator: "Nullsoft"
        }
      }
    })

    if (!fs.appPath) throw new Error("Expected `fs` to have a `appPath` function")

    await fs.mkdir(fs.appPath())
    await fs.write(fs.appPath(path.file("foo")), "bar")

    const string = [
      await fs.read(fs.appPath(path.file("foo")))
    ].join("/")

    expect(string).toEqual("bar")
  })

})
