import expect from "expect"
import { loadWebnativePage } from "../helpers/page.js"
import { pageFromContext } from "../mocha-hook.js"


describe("the filesystem", () => {

  it("provides an appPath", async function() {
    const page = await pageFromContext(this)
    await loadWebnativePage(page)

    const string = await page.evaluate(async () => {
      // @ts-ignore
      const wn = webnative

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

      return [
        await fs.read(fs.appPath(wn.path.file("foo")))
      ].join("/")
    })

    expect(string).toEqual("bar")
  })

})
