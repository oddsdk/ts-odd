import { test, expect } from "@playwright/test"
import { loadWebnativePage } from "../helpers/page"


test("the filesystem provides appPath", async ({ page }) => {
  await loadWebnativePage(page)

  const string = await page.evaluate(async () => {
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
