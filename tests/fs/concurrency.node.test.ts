import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import * as Path from "../../src/path/index.js"
import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem", () => {

  it("performs actions concurrently", async function () {
    const fs = await emptyFilesystem()

    const pathA = Path.file("private", "a")
    const pathB = Path.file("private", "b")
    const pathC = Path.file("private", "c", "foo")

    await Promise.all([
      fs.write(pathA, from_s("x"))
        .then(() => fs.write(pathA, from_s("y")))
        .then(() => fs.write(pathA, from_s("z"))),

      fs.write(pathB, from_s("1"))
        .then(() => fs.write(pathB, from_s("2"))),

      fs.write(pathC, from_s("bar")),
    ])

    const string = [
      to_s(await fs.read(pathA)),
      to_s(await fs.read(pathB)),
      to_s(await fs.read(pathC))
    ].join("")

    expect(string).toEqual([ "z", "2", "bar" ].join(""))
  })

})


function from_s(a: string): Uint8Array { return Uint8arrays.fromString(a) }
function to_s(a: Uint8Array | null): string { return a ? Uint8arrays.toString(a) : "" }
