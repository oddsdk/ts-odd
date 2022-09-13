import expect from "expect"

import * as base64 from "../../src/common/base64.js"
import * as did from "../../src/did/index.js"
import * as ucan from "../../src/ucan/index.js"


describe("Ed25519 Signatures", () => {

  it("can verify a UCAN signature", async function () {
    const encodedUcan = "eyJ1YXYiOiIxLjAuMCIsImFsZyI6IkVkRFNBIiwiY3R5IjpudWxsLCJ0eXAiOiJKV1QifQ.eyJwdGMiOiJBUFBFTkQiLCJuYmYiOjE2MTg0MjU4NzYsInJzYyI6eyJ3bmZzIjoiLyJ9LCJleHAiOjE2MTg0MjU5MzYsImlzcyI6ImRpZDprZXk6ejZNa3BoTWtYc24ybzVnN2E4M292MndjalBOeXNkZXlNMm9CdEVaUlphRXJqSlU1IiwicHJmIjpudWxsLCJhdWQiOiJkaWQ6a2V5Ono2TWtnWUdGM3RobjhrMUZ2NHA0ZFdYS3RzWENuTEg3cTl5dzRRZ05QVUxEbURLQiIsImZjdCI6W119.DItB729fJHKYhVuhjpXFOyqJeJwSpa8y5cAvbkdzzTbKTUEpKv5YfgKn5FWKzY_cnCeCLjqL_Zw9gto7kPqVCw"
    const u = ucan.decode(encodedUcan)

    const encodedHeader = ucan.encodeHeader(u.header)
    const encodedPayload = ucan.encodePayload(u.payload)

    const isValid = await did.verifySignedData({
      data: `${encodedHeader}.${encodedPayload}`,
      did: u.payload.iss,
      signature: base64.makeUrlUnsafe(u.signature || "")
    })

    expect(isValid).toBe(true)
  })

  it("can verify a JWT signature", async function () {
    const jwt = "eyJhbGciOiJFZERTQSJ9.RXhhbXBsZSBvZiBFZDI1NTE5IHNpZ25pbmc.hgyY0il_MGCjP0JzlnLWG1PPOt7-09PGcvMg3AIbQR6dWbhijcNR4ki4iylGjg5BhVsPt9g7sVvpAr_MuM0KAg"
    const s = jwt.split(".")

    const isValid = await did.verifySignedData({
      data: s.slice(0, 2).join("."),
      did: did.publicKeyToDid("11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo", did.KeyType.Edwards),
      signature: base64.makeUrlUnsafe(s[ 2 ])
    })

    expect(isValid).toBe(true)
  })

})
