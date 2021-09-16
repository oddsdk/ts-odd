import expect from "expect"
import * as fc from "fast-check"
import { race } from "./async.js"

describe("async race", () => {

  it.skip("returns a promise that was passed into it", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer()), async data => {
          const asyncFuncs = data.map(async num => {
            return async () => num
          })

          const fastestFunc = await race(asyncFuncs)
          const result = await fastestFunc()
          expect(data.includes(result)).toBe(true)
        })
    )
  })

})