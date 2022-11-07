import * as base64 from "./base64.js"
import * as fc from "fast-check"
import expect from "expect"


describe("base64", () => {

  it("round trip encodes and decodes a url", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 4000 }), data => {
        const encodedData = base64.urlEncode(data)
        const decodedData = base64.urlDecode(encodedData)
        expect(data).toEqual(decodedData)
      })
    )
  })

})