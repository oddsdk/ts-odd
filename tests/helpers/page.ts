import path from 'path'
import { promises as fs } from 'fs'

export async function loadWebnativePage(): Promise<void> {
  const htmlPath = path.join(__dirname, '../fixtures/index.html')
  await page.goto(`file://${htmlPath}`)
  const { isWebnativeLoaded, canBeFetched } = await page.evaluate(async function () {
    return {
      isWebnativeLoaded: window.webnative != null,
      canBeFetched: (await fetch("../../dist/index.min.js")).status < 300
    }
  })
  if (!isWebnativeLoaded) {
    try {
      await fs.readFile(path.join(__dirname, "../../dist/index.min.js"))
    } catch {
      throw new Error("Can't load webpage without a built browser bundle (dist/index.min.js). Please yarn build first.")
    }
    throw new Error(`Couldn't load webnative in the browser for unknown reasons. (canBeFetched: ${canBeFetched})`)
  }
}
