import path from 'path'
import { promises as fs } from 'fs'

export async function loadWebnativePage(): Promise<void> {
  const htmlPath = path.join(__dirname, '../fixtures/index.html')
  await page.setRequestInterception(true)
  page.on("request", async request => {
    const url = request.url()
    if (url.startsWith("file://") && url.endsWith(".js")) {
      const file = url.replace("file://", "")
      console.log("responding with file", file)
      return request.respond({
        status: 200,
        headers: {},
        contentType: "text/javascript",
        body: await fs.readFile(file, { encoding: "utf-8" })
      })
    }
    return request.continue()
  })
  await page.goto(`file://${htmlPath}`)
  const { isWebnativeLoaded } = await page.evaluate(async function () {
    return {
      isWebnativeLoaded: window.webnative != null,
    }
  })
  if (!isWebnativeLoaded) {
    try {
      await fs.readFile(path.join(__dirname, "../../dist/index.min.js"))
    } catch {
      throw new Error("Can't load webpage without a built browser bundle (dist/index.min.js). Please yarn build first.")
    }
    throw new Error("Couldn't load webnative in the browser for unknown reasons.")
  }
}
