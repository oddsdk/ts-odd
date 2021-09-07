import expect from "expect"
import { loadWebnativePage } from "../helpers/page.js"
import { pageFromContext } from "../mocha-hook.js"


describe("the filesystem", () => {

  it("performs actions concurrently", async function() {
    const page = await pageFromContext(this)
    await loadWebnativePage(page)

    const response = await page.evaluate(async () => {
      // @ts-ignore
      const wn = webnative

      const fs = await wn.fs.empty({
        localOnly: true,
        permissions: {
          fs: { public: [wn.path.directory(".well-known")] }
        }
      })

      await fs.addPublicExchangeKey()
      return await fs.exists(
        wn.path.combine(
          wn.fs.EXCHANGE_PATH,
          wn.path.file(await wn.did.exchange())
        )
      )
    })

    expect(response).toEqual(true)
  })

})
