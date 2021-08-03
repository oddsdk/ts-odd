import * as path from "path"
import * as url from "url"
import { promises as fs } from "fs"
import { Page } from "puppeteer"

export async function loadWebnativePage(page: Page): Promise<void> {
  const dirname = path.dirname(url.fileURLToPath(import.meta.url))
  const htmlPath = path.join(dirname, "../fixtures/index.html")
  page.on("console", async event => {
    const t = event.type()
    switch (t) {
      case "error":
      case "info":
      case "log":
        console[t](await Promise.all(event.args().map(arg => arg.jsonValue())))
        return
      default:
        return
    }
  })
  page.on("pageerror", async error => {
    console.error("Error in puppeteer: " + error.name, error.message, error.stack)
  })
  await page.goto(`file://${htmlPath}`, { waitUntil: "domcontentloaded" })
  const { isWebnativeLoaded } = await page.evaluate(async function () {
    return {
      // @ts-ignore
      isWebnativeLoaded: window.webnative != null,
    }
  })
  if (!isWebnativeLoaded) {
    try {
      await fs.readFile(path.join(dirname, "../../dist/index.umd.min.js"))
    } catch {
      throw new Error("Can't load webpage without a built browser bundle (dist/index.umd.min.js). Please yarn build first.")
    }
    throw new Error("Couldn't load webnative in the browser for unknown reasons.")
  }
}
