import expect from "expect"

import * as Crypto from "./crypto.js"

describe("Crypto", async () => {
  it("signs and verifies using RSA", async () => {
    const data = new TextEncoder().encode("🙈")
    const key = await Crypto.rsa.generateKey("sign")
    const signature = await Crypto.rsa.sign(data, key)

    expect(
      await Crypto.rsa.verify({
        message: data,
        publicKey: await Crypto.exportPublicKey(key),
        signature: signature,
      })
    ).toBe(
      true
    )
  })
})
