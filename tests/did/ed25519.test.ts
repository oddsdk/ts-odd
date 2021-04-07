import { loadWebnativePage } from '../helpers/page'

describe('Ed25519 Signatures', () => {
  beforeEach(async () => {
    await loadWebnativePage()
  })

  it('can verify a UCAN signature', async () => {
    const isValid = await page.evaluate(async () => {
      const encodedUcan = "eyJ1YXYiOiIxLjAuMCIsImFsZyI6IkVkRFNBIiwiY3R5IjpudWxsLCJ0eXAiOiJKV1QifQ.eyJwdGMiOiJBUFBFTkQiLCJuYmYiOjE2MTg0MjU4NzYsInJzYyI6eyJ3bmZzIjoiLyJ9LCJleHAiOjE2MTg0MjU5MzYsImlzcyI6ImRpZDprZXk6ejZNa3BoTWtYc24ybzVnN2E4M292MndjalBOeXNkZXlNMm9CdEVaUlphRXJqSlU1IiwicHJmIjpudWxsLCJhdWQiOiJkaWQ6a2V5Ono2TWtnWUdGM3RobjhrMUZ2NHA0ZFdYS3RzWENuTEg3cTl5dzRRZ05QVUxEbURLQiIsImZjdCI6W119.DItB729fJHKYhVuhjpXFOyqJeJwSpa8y5cAvbkdzzTbKTUEpKv5YfgKn5FWKzY_cnCeCLjqL_Zw9gto7kPqVCw"
      const ucan = webnative.ucan.decode(encodedUcan)

      const encodedHeader = webnative.ucan.encodeHeader(ucan.header)
      const encodedPayload = webnative.ucan.encodePayload(ucan.payload)
      return webnative.did.verifySignedData({
        charSize: 8,
        data: `${encodedHeader}.${encodedPayload}`,
        did: ucan.payload.iss,
        signature: webnative.machinery.base64.makeUrlUnsafe(ucan.signature || "")
      })
    })

    expect(isValid).toBe(true)
  })

  it('can verify a JWT signature', async () => {
    const isValid = await page.evaluate(async () => {
      const jwt = "eyJhbGciOiJFZERTQSJ9.RXhhbXBsZSBvZiBFZDI1NTE5IHNpZ25pbmc.hgyY0il_MGCjP0JzlnLWG1PPOt7-09PGcvMg3AIbQR6dWbhijcNR4ki4iylGjg5BhVsPt9g7sVvpAr_MuM0KAg"

      const s = jwt.split(".")

      return webnative.did.verifySignedData({
        charSize: 8,
        data: s.slice(0, 2).join("."),
        did: webnative.did.publicKeyToDid("11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo", "ed25519"),
        signature: webnative.machinery.base64.makeUrlUnsafe(s[2])
      })
    })

    expect(isValid).toBe(true)
  })
});
