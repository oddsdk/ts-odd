import assert from "assert"

import * as Crypto from "./crypto.js"

describe("Crypto", async () => {
  it("signs and verifies using RSA", async () => {
    const data = new TextEncoder().encode("🙈")
    const key = await Crypto.rsa.generateKey("sign")
    const signature = await Crypto.rsa.sign(data, key)

    assert(
      await Crypto.rsa.verify({
        message: data,
        publicKey: await Crypto.exportPublicKey(key),
        signature: signature,
      })
    )
  })

  it("encrypts and decrypts using RSA", async () => {
    const data = new TextEncoder().encode("🙈")
    const key = await Crypto.rsa.generateKey("exchange")
    const encrypted = await Crypto.rsa.encrypt(data, key.publicKey)

    assert.equal(
      await Crypto.rsa.decrypt(encrypted, key.privateKey).then(
        a => new TextDecoder().decode(a)
      ),
      "🙈"
    )
  })
})
