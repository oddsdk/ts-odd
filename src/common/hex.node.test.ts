import * as fc from "fast-check"
import { fromBytes, toBytes } from "./hex.js"
import expect from "expect"


describe("hex", () => {

  it("round trips to bytes and back out", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 16, max: 255 })), data => {
        const hexData: string[] = []
        const buffers: Uint8Array[] = []
        const returnData: string[] = []

        for (const num of data) {
          hexData.push(num.toString(16))
        }

        for (const hex of hexData) {
          buffers.push(toBytes(hex))
        }

        for (const buffer of buffers) {
          returnData.push(fromBytes(buffer))
        }

        expect(returnData).toEqual(hexData)
      })
    )
  })

})