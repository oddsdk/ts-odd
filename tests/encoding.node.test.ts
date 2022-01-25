import expect from "expect"
import * as cbor from "@ipld/dag-cbor"
import * as aes from "keystore-idb/aes/index.js"
import { SymmAlg, SymmKeyLength } from "keystore-idb/types.js"

import * as crypto from "../src/crypto/index.js"


describe("cbor encoding in node", () => {

    // This test is a regression test. There used to be problems due to Buffer vs. Uint8Array differences.

    it("works with encryption in between", async () => {
        const key = await aes.makeKey({ length: SymmKeyLength.B256, alg: SymmAlg.AES_GCM })
        const keyStr = await aes.exportKey(key)

        const message = {
            hello: "world!"
        }
        const encoded = cbor.encode(message)
        const cipher = await crypto.aes.encrypt(encoded, keyStr, SymmAlg.AES_GCM)
        const decipher = await crypto.aes.decrypt(cipher, keyStr, SymmAlg.AES_GCM)
        const decoded = cbor.decode(decipher)

        expect(decoded).toEqual(message)
    })

})
