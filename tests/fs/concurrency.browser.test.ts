import expect from "expect"
import { loadWebnativePage } from "../helpers/page.js"
import { pageFromContext } from "../mocha-hook.js"


describe("the filesystem", () => {

  it("performs actions concurrently", async function() {
    const page = pageFromContext(this)
    await loadWebnativePage(page)

    const string = await page.evaluate(async () => {
      // @ts-ignore
      const wn = webnative

      const fs = await wn.fs.empty({
        localOnly: true,
        permissions: {
          fs: { private: [wn.path.root()] }
        }
      })

      const pathA = wn.path.file(wn.path.Branch.Private, "a")
      const pathB = wn.path.file(wn.path.Branch.Private, "b")
      const pathC = wn.path.file(wn.path.Branch.Private, "c", "foo")

      await Promise.all([
        fs.write(pathA, "x")
          .then(() => fs.write(pathA, "y"))
          .then(() => fs.write(pathA, "z")),

        fs.write(pathB, "1")
          .then(() => fs.write(pathB, "2")),

        fs.write(pathC, "bar"),
      ])

      return [
        await fs.read(pathA),
        await fs.read(pathB),
        await fs.read(pathC)
      ].join("")
    })

    expect(string).toEqual(["z", "2", "bar"].join(""))
  })

})
