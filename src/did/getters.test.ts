import expect from "expect"

import * as setup from "../setup.js"
import * as storage from "../storage/index.js"
import { ownRoot, root } from "./getters.js"
import { HTTP_IMPLEMENTATION } from "../dns/implementation/http.js"
import { Storage } from "../../tests/helpers/in-memory-storage.js"


const lookupTxtRecord = (domain: string): Promise<string | null> => {
  const did = dnsResolver[domain] ?? null
  return Promise.resolve(did)
}

const store = new Storage()

setup.setImplementations({
  dns: {
    ...HTTP_IMPLEMENTATION.dns,
    lookupTxtRecord
  },
  storage: {
    getItem: store.getItem,
    setItem: store.setItem,
    removeItem: store.removeItem,
    clear: store.clear
  }
})

setup.endpoints({ user: "fissionuser.memory" })

const dnsResolver: Record<string, string> = {
  "_did.elm-owl.fissionuser.memory": "did:key:z6MkeTexeJLzs8HeQ1AXQVP5V26TrZ751Nin26N8NARcTGJC",
  "_did.haskell-wizard.fissionuser.memory": "did:key:z6MktF5zxTKf6Jhc8bZ3RsYBG8yeAgt9rjJvNNWkJr9NbjiB"
}

describe("root", async () => {
  it("gets a did for a user", async () => {
    const owlDid = await root("elm-owl")
    const wizardDid = await root("haskell-wizard")

    expect(owlDid).toEqual(dnsResolver[ "_did.elm-owl.fissionuser.memory" ])
    expect(wizardDid).toEqual(dnsResolver[ "_did.haskell-wizard.fissionuser.memory" ])
  })

  it("throws when a user record does not exist", async () => {
    await expect(root("no-such-user"))
      .rejects
      .toThrow()
  })
})


describe("ownRoot", async () => {
  it("gets a did for an authed user", async () => {
    await storage.setItem("webnative.auth_username", "elm-owl")
    const owlDid = await ownRoot()
    expect(owlDid).toEqual(dnsResolver[ "_did.elm-owl.fissionuser.memory" ])

    await storage.setItem("webnative.auth_username", "haskell-wizard")
    const wizardDid = await ownRoot()
    expect(wizardDid).toEqual(dnsResolver[ "_did.haskell-wizard.fissionuser.memory" ])
  })

  it("throws when a user record does not exist", async () => {
    await storage.setItem("webnative.auth_username", "no-such-user")
    await expect(ownRoot())
      .rejects
      .toThrow()
  })
})