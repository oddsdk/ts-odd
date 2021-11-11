import expect from "expect"
import * as cbor from "cborg"
import * as aes from "keystore-idb/aes/index.js"
import { SymmKeyLength } from "keystore-idb/types.js"

import * as crypto from "../src/crypto/index.js"


describe("cbor encoding in node", () => {

    it("works with encryption in between", async () => {
        const key = await aes.makeKey({ length: SymmKeyLength.B256 })
        const keyStr = await aes.exportKey(key)

        const message = {
            hello: "world!"
        }
        const encoded = cbor.encode(message)
        const cipher = await crypto.aes.encrypt(encoded, keyStr)
        const decipher = await crypto.aes.decrypt(cipher, keyStr)
        const decoded = cbor.decode(decipher)

        expect(decoded).toEqual(message)
    })

})
