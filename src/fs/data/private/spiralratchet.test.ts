import expect from "expect"
import * as fc from "fast-check"

import * as ratchet from "./spiralratchet.js"
import { getCrypto } from "./context.js"


describe("the spiral ratchet module", () => {

  const ctx = getCrypto()

  it("has the property that complementing twice will always yield the same", () => {
    fc.assert(
      fc.property(fc.uint8Array(), arr => {
        expect(new Uint8Array(ratchet.complement(ratchet.complement(arr.buffer))))
          .toEqual(arr)
      })
    )
  })

  it("has the property that complementing once will always yield another value", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1 }), arr => {
        expect(new Uint8Array(ratchet.complement(arr.buffer)))
          .not.toEqual(arr)
      })
    )
  })

  it("has the property add65536 = 256 * add256", async () => {
    const spiral = await ratchet.setup(ctx)
    expect(await ratchet.add65536(spiral, ctx))
      .toEqual(await iterateAsync(spiral, s => ratchet.add256(s, ctx), 256))
  })

  it("has the property add256 = 256 * add1", async () => {
    const spiral = await ratchet.setup(ctx)
    expect(await ratchet.add256(spiral, ctx))
      .toEqual(await iterateAsync(spiral, s => ratchet.add1(s, ctx), 256))
  })

  it("has the property add65536 = 65536 * add1", async () => {
    const spiral = await ratchet.setup(ctx)
    expect(await ratchet.add65536(spiral, ctx))
      .toEqual(await iterateAsync(spiral, s => ratchet.add1(s, ctx), 65536))
  })

})

async function iterateAsync<T>(initial: T, f: (obj: T) => Promise<T>, n: number): Promise<T> {
  let obj = initial
  for (let i = 0; i < n; i++) {
    obj = await f(obj)
  }
  return obj
}
