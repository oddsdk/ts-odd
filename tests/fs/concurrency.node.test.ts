import expect from "expect"

import * as path from "../../src/path.js"
import FileSystem from "../../src/fs/filesystem.js"


describe("the filesystem", () => {

  it("performs actions concurrently", async function() {
    const fs = await FileSystem.empty({
      localOnly: true,
      permissions: {
        fs: { private: [path.root()] }
      }
    })

    const pathA = path.file(path.Branch.Private, "a")
    const pathB = path.file(path.Branch.Private, "b")
    const pathC = path.file(path.Branch.Private, "c", "foo")

    await Promise.all([
      fs.write(pathA, "x")
        .then(() => fs.write(pathA, "y"))
        .then(() => fs.write(pathA, "z")),

      fs.write(pathB, "1")
        .then(() => fs.write(pathB, "2")),

      fs.write(pathC, "bar"),
    ])

    const string = [
      await fs.read(pathA),
      await fs.read(pathB),
      await fs.read(pathC)
    ].join("")

    expect(string).toEqual(["z", "2", "bar"].join(""))
  })

})
