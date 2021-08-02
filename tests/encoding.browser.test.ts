import expect from "expect"
import { loadWebnativePage } from "./helpers/page.js"
import { pageFromContext } from "./mocha-hook.js"


describe("cbor encoding in the browser", () => {

  it("works with encryption in between", async function() {
    const page = pageFromContext(this)
    await loadWebnativePage(page)

    async function runRoundTrip(message: any) {
      // @ts-ignore
      const wn = webnative
      const keyStr = await wn.crypto.aes.genKeyStr()

      const encoded = wn.cbor.encode(message)
      const cipher = await wn.crypto.aes.encrypt(encoded, keyStr)
      const decipher = await wn.crypto.aes.decrypt(cipher, keyStr)
      const decoded = wn.cbor.decode(decipher)

      return decoded
    }

    const message = { hello: "world!" }
    expect(await page.evaluate(runRoundTrip, message)).toEqual(message)
  })

})
