import expect from "expect"

// import * as did from "../../src/did/index.js"
import { root } from "./getters.js"
import { DNS_IMPLEMENTATION } from "../dns/implementation/dns"
// import { endpoints, setImplementations } from "../setup.js"
import * as setup from "../setup.js"

const dnsResolver = {
  "fissionuser.memory": {
   "elm-owl": "did"
  }
}

const lookupTxtRecord = (domain: string): Promise<string| null> => {
  const records = dnsResolver[domain]
  console.log(records)

  return Promise.resolve("sureok")
}

setup.setImplementations({
  dns: {
    ...DNS_IMPLEMENTATION.dns,
    lookupTxtRecord
  }
})

setup.endpoints({ user: "fissionuser.memory"})




describe("root", async () => {
  it("gets a did for a user", async () => {
    const did = await root("elm-owl")
    // const { temporaryRsaPair, temporaryDID } = await consumer.generateTemporaryExchangeKey()

    expect(did).toBeDefined()
    // expect(temporaryRsaPair).not.toBeNull()
    // expect(temporaryDID).toBeDefined()
    // expect(temporaryDID).not.toBeNull()
  })
})