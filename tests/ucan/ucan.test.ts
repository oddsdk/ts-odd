import { loadWebnativePage } from '../helpers/page'


describe('UCAN', () => {
  beforeEach(async () => {
    await loadWebnativePage()
  })

  it('can build an empty UCAN', async () => {
    const [did1,did2] = await page.evaluate(async () => {
      let did = await webnative.did.ucan()
      let ucan = await webnative.ucan.build({})
      return [ucan.payload.aud, did]
    })

    expect(did1).toEqual(did2)
  })

  it('can build a UCAN', async () => {
    const isValid = await page.evaluate(async () => {
      const ucan = await webnative.ucan.build({
        audience: await randomRsaDid(),
        issuer: await webnative.did.ucan()
      })

      return webnative.ucan.isValid(ucan)
    })

    expect(isValid).toBe(true)
  })

  it('can validate a UCAN with a valid proof', async () => {
    const isValid = await page.evaluate(async () => {
      const storeA = webnative.keystore.create()
      const storeB = webnative.keystore.create()
  
      await webnative.keystore.set(storeB)
      const issB = await webnative.did.ucan()
  
      // Proof
      await webnative.keystore.set(storeA)
      const issA = await webnative.did.ucan()
      const prf = await webnative.ucan.build({
        audience: issB,
        issuer: issA
      })
  
      // Shell
      await webnative.keystore.set(storeB)
      const ucan = await webnative.ucan.build({
        audience: await randomRsaDid(),
        issuer: issB,
        proofs: [ prf ]
      })
  
      // Validate
      return webnative.ucan.isValid(ucan)
    })

    expect(isValid).toBe(true)
  })

  it('can validate a UCAN with a sessionKey fact', async() => {
    const isValid = await page.evaluate(async () => {
      const sessionKey = 'RANDOM KEY'
      const ucan = await webnative.ucan.build({
        issuer: await webnative.did.ucan(),
        audience: await randomRsaDid(),
        lifetimeInSeconds: 60 * 5, // 5 minutes
        facts: [{ sessionKey }]
      })

      return webnative.ucan.isValid(ucan)
    })

    expect(isValid).toBe(true)
  })

  it('decodes and reencodes UCAN to the same value', async() => {
    const isSame = await page.evaluate(async () => {
      const ucan = "eyJ1YXYiOiIxLjAuMCIsImFsZyI6IkVkRFNBIiwiY3R5IjpudWxsLCJ0eXAiOiJKV1QifQ.eyJwdGMiOiJBUFBFTkQiLCJuYmYiOjE2MTg0MjU4NzYsInJzYyI6eyJ3bmZzIjoiLyJ9LCJleHAiOjE2MTg0MjU5MzYsImlzcyI6ImRpZDprZXk6ejZNa3BoTWtYc24ybzVnN2E4M292MndjalBOeXNkZXlNMm9CdEVaUlphRXJqSlU1IiwicHJmIjpudWxsLCJhdWQiOiJkaWQ6a2V5Ono2TWtnWUdGM3RobjhrMUZ2NHA0ZFdYS3RzWENuTEg3cTl5dzRRZ05QVUxEbURLQiIsImZjdCI6W119.DItB729fJHKYhVuhjpXFOyqJeJwSpa8y5cAvbkdzzTbKTUEpKv5YfgKn5FWKzY_cnCeCLjqL_Zw9gto7kPqVCw"
      const decoded = webnative.ucan.decode(ucan)
      const reencoded = webnative.ucan.encode(decoded)
      return ucan === reencoded
    })

    expect(isSame).toBe(true)
  })

});
