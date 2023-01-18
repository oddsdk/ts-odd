import expect from "expect"
import * as DID from "../src/did/index.js"
import * as Webnative from "../src/index.js"
import { components, configuration, username } from "./helpers/components.js"


describe("accountDID shorthand", async () => {
  const program = await Webnative.assemble(configuration, { ...components })

  expect(await program.accountDID(username)).toEqual(
    await DID.write(components.crypto)
  )
})
