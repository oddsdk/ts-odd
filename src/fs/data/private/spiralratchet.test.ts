import expect from "expect"
import * as fc from "fast-check"

import * as ratchet from "./spiralratchet.js"
import { getCrypto } from "./context.js"


describe("the spiral ratchet module", () => {

  const ctx = getCrypto()

 //  it("has the property that complementing twice will always yield the same", () => {
 //    fc.assert(
 //      fc.property(fc.uint8Array(), arr => {
 //        expect(new Uint8Array(ratchet.complement(ratchet.complement(arr.buffer))))
 //          .toEqual(arr)
 //      })
 //    )
 //  })

 //  it("has the property that complementing once will always yield another value", () => {
 //    fc.assert(
 //      fc.property(fc.uint8Array({ minLength: 1 }), arr => {
 //        expect(new Uint8Array(ratchet.complement(arr.buffer)))
 //          .not.toEqual(arr)
 //      })
 //    )
 //  })

//  it("has the property next65536Epoch = 256 * next256Epoch", async () => {
//    const spiral = await ratchet.setup(ctx)
//    expect(await ratchet.next65536Epoch(spiral, ctx))
//      .toEqual(await iterateAsync(spiral, s => ratchet.next256Epoch(s, ctx), 256))
//  })
//
//  it("has the property next256Epoch = 256 * inc", async () => {
//    const spiral = await ratchet.setup(ctx)
//    expect(await ratchet.next256Epoch(spiral, ctx))
//      .toEqual(await iterateAsync(spiral, s => ratchet.inc(s, ctx), 256))
//  })
//
//  it("has the property next65536Epoch = 65536 * inc", async () => {
//    const spiral = await ratchet.setup(ctx)
//    expect(await ratchet.next65536Epoch(spiral, ctx))
//      .toEqual(await iterateAsync(spiral, s => ratchet.inc(s, ctx), 65536))
//  })

  const iters = 123456
  it(`has the property incBy ${iters} = ${iters} * inc`, async () => {
    const spiral = await ratchet.setup(ctx)
    const positional = await ratchet.incBy(spiral, ctx, iters)
    const unary = await iterateAsync(spiral, s => ratchet.inc(s, ctx), iters)

    expect(positional).toEqual(unary)
  })

})

async function iterateAsync<T>(initial: T, f: (obj: T) => Promise<T>, n: number): Promise<T> {
  let obj = initial
  for (let i = 0; i < n; i++) {
    obj = await f(obj)
  }
  return obj
}
