import { expect } from "@playwright/test"
import * as wn from "../../src/index"


describe("FS", () => {
  it("can use appPath", async () => {
    const fs = await wn.fs.empty({
      localOnly: true,
      permissions: {
        app: {
          name: "Winamp",
          creator: "Nullsoft"
        }
      }
    })

    await fs.mkdir(fs.appPath())
    await fs.write(fs.appPath(wn.path.file("foo")), "bar")

    const string = [
      await fs.read(fs.appPath(wn.path.file("foo")))
    ].join("/")

    expect(string).toEqual("bar")
  })
})
