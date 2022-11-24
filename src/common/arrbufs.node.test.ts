import * as fc from "fast-check"
import expect from "expect"
import { equal } from "./arrbufs.js"


describe("arrbufs", () => {

  it("supports equal", () => {
    fc.assert(
      fc.property(fc.uint8Array(), data => {
        expect(equal(data.buffer, data.buffer)).toBe(true)
      })
    )
  })

  it("supports not equal", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.uint8Array({ minLength: 3 }),
          fc.uint8Array({ minLength: 3 })
        ), data => {
          expect(equal(data[ 0 ].buffer, data[ 1 ].buffer)).toBe(false)
        })
    )
  })

})