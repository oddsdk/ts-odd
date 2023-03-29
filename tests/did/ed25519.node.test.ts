import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import * as Ucan from "../../src/ucan/index.js"
import { components } from "../helpers/components.js"
import { didToPublicKey } from "../../src/did/index.js"


describe("Ed25519 Signatures", () => {

  it("can verify a UCAN signature", async function () {
    const encodedUcan = "eyJ1YXYiOiIxLjAuMCIsImFsZyI6IkVkRFNBIiwiY3R5IjpudWxsLCJ0eXAiOiJKV1QifQ.eyJwdGMiOiJBUFBFTkQiLCJuYmYiOjE2MTg0MjU4NzYsInJzYyI6eyJ3bmZzIjoiLyJ9LCJleHAiOjE2MTg0MjU5MzYsImlzcyI6ImRpZDprZXk6ejZNa3BoTWtYc24ybzVnN2E4M292MndjalBOeXNkZXlNMm9CdEVaUlphRXJqSlU1IiwicHJmIjpudWxsLCJhdWQiOiJkaWQ6a2V5Ono2TWtnWUdGM3RobjhrMUZ2NHA0ZFdYS3RzWENuTEg3cTl5dzRRZ05QVUxEbURLQiIsImZjdCI6W119.DItB729fJHKYhVuhjpXFOyqJeJwSpa8y5cAvbkdzzTbKTUEpKv5YfgKn5FWKzY_cnCeCLjqL_Zw9gto7kPqVCw"
    const u = Ucan.decode(encodedUcan)

    const encodedHeader = Ucan.encodeHeader(u.header)
    const encodedPayload = Ucan.encodePayload(u.payload)

    const isValid = await components.crypto.did.keyTypes[ "ed25519" ].verify({
      message: Uint8arrays.fromString(`${encodedHeader}.${encodedPayload}`, "utf8"),
      publicKey: didToPublicKey(components.crypto, u.payload.iss).publicKey,
      signature: Uint8arrays.fromString(u.signature || "", "base64url")
    })

    expect(isValid).toBe(true)
  })

  it("can verify a JWT signature", async function () {
    const jwt = "eyJhbGciOiJFZERTQSJ9.RXhhbXBsZSBvZiBFZDI1NTE5IHNpZ25pbmc.hgyY0il_MGCjP0JzlnLWG1PPOt7-09PGcvMg3AIbQR6dWbhijcNR4ki4iylGjg5BhVsPt9g7sVvpAr_MuM0KAg"
    const s = jwt.split(".")

    const isValid = await components.crypto.did.keyTypes[ "ed25519" ].verify({
      message: Uint8arrays.fromString(s.slice(0, 2).join("."), "utf8"),
      publicKey: Uint8arrays.fromString("11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo", "base64pad"),
      signature: Uint8arrays.fromString(s[ 2 ], "base64url")
    })

    expect(isValid).toBe(true)
  })

})
