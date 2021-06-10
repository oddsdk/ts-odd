import cbor from 'cborg'
import * as aes from 'keystore-idb/aes/index'
import { SymmKeyLength } from 'keystore-idb/types'
import { JEST_IMPLEMENTATION } from '../src/setup/jest'
import { loadWebnativePage } from './helpers/page'


describe("cbor encoding", () => {
    it("works in node with encryption in between", async () => {
        const key = await aes.makeKey({ length: SymmKeyLength.B256 })
        const keyStr = await aes.exportKey(key)

        const message = {
            hello: "world!"
        }
        const encoded = cbor.encode(message)
        const cipher = await JEST_IMPLEMENTATION.aes.encrypt(encoded, keyStr)
        const decipher = await JEST_IMPLEMENTATION.aes.decrypt(cipher, keyStr)
        const decoded = cbor.decode(decipher)

        expect(decoded).toEqual(message)
    })

    it("works in the browser with encryption in between", async () => {
        await loadWebnativePage()

        async function runRoundTrip(message) {
            const keyStr = await webnative.crypto.aes.genKeyStr()

            const encoded = webnative.cbor.encode(message)
            console.log(encoded.length, encoded.byteLength)
            const cipher = await webnative.crypto.aes.encrypt(encoded, keyStr)
            const decipher = await webnative.crypto.aes.decrypt(cipher, keyStr)
            console.log(decipher.length, decipher.byteLength)
            const decoded = webnative.cbor.decode(decipher)

            return decoded
        }

        const message = { hello: "world!" }
        expect(await page.evaluate(runRoundTrip, message)).toEqual(message)
    })
})
