const test = require("ava")
const withWebnativeContext = require("./helpers/withWebnative")


test("building a valid UCAN", withWebnativeContext, async (t, page) => {
  const isValid = await page.evaluate(async () => {
    const ucan = await webnative.ucan.build({
      attenuations: [],
      audience: "aud",
      issuer: await webnative.did.ucan(),
      proofs: []
    })

    return webnative.ucan.isValid(ucan)
  })

  t.true(isValid)
})
