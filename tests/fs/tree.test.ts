import { loadWebnativePage } from "../helpers/page"


describe("FS", () => {
  it("creates the parent directories automatically", async () => {
    await loadWebnativePage()

    const string = await page.evaluate(async () => {
      const expected = "content"
      const fs = await new webnative.fs.empty({
        localOnly: true,
        permissions: {
          fs: { private: { directories: [ "/" ] } }
        }
      })

      const privatePath = "private/a/b/c.txt"
      const publicPath = "public/a/b/c.txt"

      await fs.write(privatePath, expected)
      await fs.write(publicPath, expected)

      return [
        await fs.read(privatePath),
        await fs.read(publicPath)
      ].join("/")
    })

    expect(string).toEqual("content/content")
  })
});
