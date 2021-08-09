import expect from "expect"
import { loadWebnativePage } from "../helpers/page.js"
import { pageFromContext } from "../mocha-hook.js"


describe("UCAN", () => {

  it("can be built", async function() {
    const page = await pageFromContext(this)
    await loadWebnativePage(page)

    const isValid = await page.evaluate(async () => {
      // @ts-ignore
      const wn = webnative
      const ucan = await wn.ucan.build({
        // @ts-ignore
        audience: await randomRsaDid(),
        issuer: await wn.did.ucan()
      })

      return wn.ucan.isValid(ucan)
    })

    expect(isValid).toBe(true)
  })

  it("can validate a UCAN with a valid proof", async function() {
    const page = await pageFromContext(this)
    await loadWebnativePage(page)

    const isValid = await page.evaluate(async () => {
      // @ts-ignore
      const wn = webnative
      const storeA = wn.keystore.create()
      const storeB = wn.keystore.create()

      await wn.keystore.set(storeB)
      const issB = await wn.did.ucan()

      // Proof
      await wn.keystore.set(storeA)
      const issA = await wn.did.ucan()
      const prf = await wn.ucan.build({
        audience: issB,
        issuer: issA
      })

      // Shell
      await wn.keystore.set(storeB)
      const ucan = await wn.ucan.build({
        // @ts-ignore
        audience: await randomRsaDid(),
        issuer: issB,
        proofs: [prf]
      })

      // Validate
      return wn.ucan.isValid(ucan)
    })

    expect(isValid).toBe(true)
  })

  it("can validate a UCAN with a sessionKey fact", async function() {
    const page = await pageFromContext(this)
    await loadWebnativePage(page)

    const isValid = await page.evaluate(async () => {
      // @ts-ignore
      const wn = webnative
      const sessionKey = "RANDOM KEY"
      const ucan = await wn.ucan.build({
        issuer: await wn.did.ucan(),
        // @ts-ignore
        audience: await randomRsaDid(),
        lifetimeInSeconds: 60 * 5, // 5 minutes
        facts: [{ sessionKey }]
      })

      return wn.ucan.isValid(ucan)
    })

    expect(isValid).toBe(true)
  })

  it("decodes and reencodes UCAN to the same value", async function() {
    const page = await pageFromContext(this)
    await loadWebnativePage(page)

    const isSame = await page.evaluate(async () => {
      // @ts-ignore
      const wn = webnative
      const ucan = "eyJ1YXYiOiIxLjAuMCIsImFsZyI6IkVkRFNBIiwiY3R5IjpudWxsLCJ0eXAiOiJKV1QifQ.eyJwdGMiOiJBUFBFTkQiLCJuYmYiOjE2MTg0MjU4NzYsInJzYyI6eyJ3bmZzIjoiLyJ9LCJleHAiOjE2MTg0MjU5MzYsImlzcyI6ImRpZDprZXk6ejZNa3BoTWtYc24ybzVnN2E4M292MndjalBOeXNkZXlNMm9CdEVaUlphRXJqSlU1IiwicHJmIjpudWxsLCJhdWQiOiJkaWQ6a2V5Ono2TWtnWUdGM3RobjhrMUZ2NHA0ZFdYS3RzWENuTEg3cTl5dzRRZ05QVUxEbURLQiIsImZjdCI6W119.DItB729fJHKYhVuhjpXFOyqJeJwSpa8y5cAvbkdzzTbKTUEpKv5YfgKn5FWKzY_cnCeCLjqL_Zw9gto7kPqVCw"
      const decoded = wn.ucan.decode(ucan)
      const reencoded = wn.ucan.encode(decoded)
      return ucan === reencoded
    })

    expect(isSame).toBe(true)
  })

})
