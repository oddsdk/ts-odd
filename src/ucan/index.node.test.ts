import expect from "expect"

import * as InMemoryCryptoStore from "../common/crypto/store/in-memory.js"
import * as WebCryptoAgent from "../components/agent/implementation/web-crypto-api.js"

import * as Ucan from "./index.js"

describe("UCAN", async () => {
  it("signs a UCAN properly using a web-crypto-api agent", async () => {
    const store = InMemoryCryptoStore.create()
    const agent = await WebCryptoAgent.implementation({ store })

    const ucan = await Ucan.build({
      audience: "did:whatever",
      issuer: await Ucan.keyPair(agent),
    })

    expect(
      await Ucan.isValid(agent, ucan)
    ).toBe(
      true
    )
  })
})
