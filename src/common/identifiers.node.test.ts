import expect from "expect"
import { bareNameFilter, readKey } from "./identifiers.js"
import { account, crypto } from "../../tests/helpers/components.js"


describe("identifiers", () => {

  const accountDID = account.rootDID

  it("bare name filter starts with wnfs__bareNameFilter__", async () => {
    const result = await bareNameFilter({ accountDID, crypto, path: { file: [ "public", "test" ] } })
    expect(result).toMatch(/^wnfs__bareNameFilter__/)
  })

  it("read key starts with wnfs__readKey__", async () => {
    const result = await readKey({ accountDID, crypto, path: { file: [ "private", "test" ] } })
    expect(result).toMatch(/^wnfs__readKey__/)
  })

})