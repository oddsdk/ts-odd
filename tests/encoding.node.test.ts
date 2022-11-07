import expect from "expect"
import * as cbor from "@ipld/dag-cbor"
import { SymmAlg } from "keystore-idb/types.js"

import { components } from "./helpers/components.js"


describe("cbor encoding in node", () => {

    // This test is a regression test. There used to be problems due to Buffer vs. Uint8Array differences.

    it("works with encryption in between", async () => {
        const key = await components.crypto.aes.genKey(SymmAlg.AES_GCM)
        const keyStr = await components.crypto.aes.exportKey(key)

        const message = {
            hello: "world!"
        }
        const encoded = cbor.encode(message)
        const cipher = await components.crypto.aes.encrypt(encoded, keyStr, SymmAlg.AES_GCM)
        const decipher = await components.crypto.aes.decrypt(cipher, keyStr, SymmAlg.AES_GCM)
        const decoded = cbor.decode(decipher)

        expect(decoded).toEqual(message)
    })

})
