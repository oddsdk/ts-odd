import { loadWebnativePage } from '../helpers/page'


describe('UCAN', () => {
  beforeEach(async () => {
    await loadWebnativePage()
  })

  it('can verify a UCAN signature', async () => {
    const isValid = await page.evaluate(async () => {
      const ucan = "eyJ1YXYiOiIxLjAuMCIsImFsZyI6IkVkRFNBIiwiY3R5IjpudWxsLCJ0eXAiOiJKV1QifQ.eyJwdGMiOiJBUFBFTkQiLCJuYmYiOjE2MTc4NTMyMjIsInJzYyI6IioiLCJleHAiOjk2NTk1MzMyNTIsImlzcyI6ImRpZDprZXk6ejJEV3NHWEZTVndGM3FUcGFEcnVXbVU3S01tR3FId3JIbnpqMmJYTWk0SjQzaFMiLCJwcmYiOm51bGwsImF1ZCI6ImRpZDprZXk6ejJEU1c1MzZiY1d4UEd1ejdaTW5YZGp1NjRwQm9XcnliVHl6VHFXWVdhN0Vqc0IiLCJmY3QiOltdfQ.kV8w3viTHShkqwSjfV99vtImO4E1p-k6bIWQbe68KyPB54ZpiGyJogjIuPKxEZsbDk7UZW9qED14IwT89S1IBg"

      const decodedUcan = webnative.ucan.decode(ucan)

      return webnative.did.verifySignedData({
        charSize: 8,
        data: ucan.split(".").slice(0, 2).join("."),
        did: decodedUcan.payload.iss,
        signature: decodedUcan.signature.replace(/_/g, "/").replace(/-/g, "+")
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
        did: webnative.did.publicKeyToDid("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a", "ed25519"),
        signature: s[2].replace(/_/g, "/").replace(/-/g, "+")
      })
    })

    expect(isValid).toBe(true)
  })
});
