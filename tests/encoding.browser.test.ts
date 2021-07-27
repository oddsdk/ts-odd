import { test, expect } from "@playwright/test"
import { loadWebnativePage } from './helpers/page'


test("cbor encoding works in the browser with encryption in between", async ({ page }) => {
  await loadWebnativePage(page)

  async function runRoundTrip(message) {
    const keyStr = await webnative.crypto.aes.genKeyStr()

    const encoded = webnative.cbor.encode(message)
    const cipher = await webnative.crypto.aes.encrypt(encoded, keyStr)
    const decipher = await webnative.crypto.aes.decrypt(cipher, keyStr)
    const decoded = webnative.cbor.decode(decipher)

    return decoded
  }

  const message = { hello: "world!" }
  expect(await page.evaluate(runRoundTrip, message)).toEqual(message)
})
