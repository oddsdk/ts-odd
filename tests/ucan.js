const test = require("ava")
const withWebnativeContext = require("./helpers/withWebnative")


test("building a valid UCAN", withWebnativeContext, async (t, page) => {
  const isValid = await page.evaluate(async () => {
    const ucan = await webnative.ucan.build({
      attenuations: [],
      audience: "aud",
      issuer: "iss",
      proofs: []
    })

    const did = await webnative.did.ucan()
    return webnative.ucan.isValid(ucan, did)
  })

  t.true(isValid)
})
