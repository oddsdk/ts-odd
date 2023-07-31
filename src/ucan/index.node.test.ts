import { strict as assert } from "assert"

import * as InMemoryCryptoStore from "../common/crypto/store/in-memory.js"
import * as WebCryptoAgent from "../components/agent/web-crypto-api.js"

import * as Ucan from "./index.js"

describe("UCAN", async () => {
  it("signs a UCAN properly using a web-crypto-api agent", async () => {
    const store = InMemoryCryptoStore.create()
    const agent = await WebCryptoAgent.implementation({ store })

    const ucan = await Ucan.build({
      audience: "did:whatever",
      issuer: await Ucan.keyPair(agent),
    })

    assert.equal(
      await Ucan.isValid(agent, ucan),
      true
    )
  })
})
