import { loadWebnativePage } from "../helpers/page"


describe("FS", () => {
  it("perform actions concurrently", async () => {
    await loadWebnativePage()

    const string = await page.evaluate(async () => {
      const fs = await new webnative.fs.empty({ localOnly: true })

      await Promise.all([
        fs.write("private/a", "x")
          .then(_ => fs.write("private/a", "y"))
          .then(_ => fs.write("private/a", "z")),

        fs.write("private/b", "1")
          .then(_ => fs.write("private/b", "2")),

        fs.mkdir("private/c")
          .then(_ => fs.write("private/c/foo", "bar")),
      ])

      return [
        await fs.read("private/a"),
        await fs.read("private/b"),
        await fs.read("private/c/foo")
      ].join("")
    })

    expect(string).toEqual([ "z", "2", "bar" ].join(""))
  })
});
