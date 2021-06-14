import { loadWebnativePage } from "../helpers/page"


describe("FS", () => {
  it("perform actions concurrently", async () => {
    await loadWebnativePage()

    const string = await page.evaluate(async () => {
      const wn = webnative

      const fs = await wn.fs.empty({
        localOnly: true,
        permissions: {
          fs: { private: [ wn.path.root() ] }
        }
      })

      const pathA = wn.path.file(wn.path.Branch.Private, "a")
      const pathB = wn.path.file(wn.path.Branch.Private, "b")
      const pathC = wn.path.file(wn.path.Branch.Private, "c", "foo")

      await Promise.all([
        fs.write(pathA, "x")
          .then(_ => fs.write(pathA, "y"))
          .then(_ => fs.write(pathA, "z")),

        fs.write(pathB, "1")
          .then(_ => fs.write(pathB, "2")),

        fs.write(pathC, "bar"),
      ])

      return [
        await fs.read(pathA),
        await fs.read(pathB),
        await fs.read(pathC)
      ].join("")
    })

    expect(string).toEqual([ "z", "2", "bar" ].join(""))
  })
});
