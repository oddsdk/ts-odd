import expect from "expect"
import { loadWebnativePage } from "../helpers/page.js"
import { pageFromContext } from "../mocha-hook.js"


describe("the filesystem", () => {

  it("creates parent directories automatically", async function() {
    const page = pageFromContext(this)
    await loadWebnativePage(page)

    const string = await page.evaluate(async () => {
      const expected = "content"
      // @ts-ignore
      const wn = webnative

      const fs = await wn.fs.empty({
        localOnly: true,
        permissions: {
          fs: { private: [wn.path.root()] }
        }
      })

      const privatePath = wn.path.file(wn.path.Branch.Private, "a", "b", "c.txt")
      const publicPath = wn.path.file(wn.path.Branch.Public, "a", "b", "c.txt")

      await fs.write(privatePath, expected)
      await fs.write(publicPath, expected)

      return [
        await fs.read(privatePath),
        new TextDecoder().decode(await fs.read(publicPath))
      ].join("/")
    })

    expect(string).toEqual("content/content")
  })

})
