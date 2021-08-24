import expect from "expect"
import * as fc from "fast-check"

import * as ratchet from "./spiralratchet.js"
import { getCrypto } from "./context.js"

describe("the spiral ratchet module", () => {

  const ctx = getCrypto()

  describe('complement', async () => {
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
  })

  describe('next65536Epoch', async () => {
    it("has the property that next65536Epoch rounds up to the next large zero", async () => {
      const spiral = await ratchet.setup(ctx)
      const slow = await iterateAsync(spiral, s => ratchet.next256Epoch(s, ctx), 256 - spiral.mediumCounter)
      const fast = await ratchet.next65536Epoch(spiral, ctx)
      check(slow, fast)
    })
  })

  describe('next256Epoch', async () => {
    it("rounds up to the next medium zero", async () => {
      const spiral = await ratchet.setup(ctx)
      const fast = await ratchet.next256Epoch(spiral, ctx)
      const slow = await iterateAsync(spiral, s => ratchet.inc(s, ctx), 256 - spiral.smallCounter)
      check(fast, slow)
    })
  })

  describe("incBy", async () => {
    const test = (iters: number, smallOffset: number, mediumOffset: number) =>  {
      it(`has the property incBy ${iters} = ${iters} * inc`, async () => {
        const spiral = await ratchet.setup(ctx, str2ab("hello world"), smallOffset, mediumOffset)
        const positional = await ratchet.incBy(spiral, ctx, iters)
        const unary = await iterateAsync(spiral, s => ratchet.inc(s, ctx), iters)
        check(positional, unary)
      })
    }

    context("not along rollover point", async () => {
      context("no change", async () => test(0, 0, 0))
      context("small change", async () => test(8, 0, 0))
      context("medium change", async () => test(450, 0 ,0))
      context("large change", async () => test(70000, 0, 0))
    })

    context("near rollover point", async () => {
      context("no change", async () => test(0, 255, 255))
      context("small change c", async () => test(8, 255, 255))
      context("medium change", async () => test(450, 255, 255))
      context("large change", async () => test(70000, 255, 255))
    })

    context("prop change", async () => {
      it("works with any number of iterations", async () => {
        fc.assert(fc.asyncProperty(fc.nat(), fc.string(), async (iters: number, seed: string): Promise<void> => {
          const spiral = await ratchet.setup(ctx, str2ab(seed))
          const positional = await ratchet.incBy(spiral, ctx, iters)
          const unary = await iterateAsync(spiral, s => ratchet.inc(s, ctx), iters)
          check(positional, unary)
        }))
      })
    })
  })
})

async function iterateAsync<T>(initial: T, f: (obj: T) => Promise<T>, n: number): Promise<T> {
  let obj = initial
  for (let i = 0; i < n; i++) {
    obj = await f(obj)
  }
  return obj
}

function ab2str(buf: ArrayBuffer): string {
    var dataView = new DataView(buf);
    var decoder = new TextDecoder('utf-8');
    return decoder.decode(dataView);
}

function str2ab(str: string): ArrayBuffer {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function check(spiralA: ratchet.SpiralRatchet, spiralB: ratchet.SpiralRatchet): void {
  const checkable = (s: ratchet.SpiralRatchet): any => {
    return {
      ...s,
      large: ab2str(s.large),
      medium: ab2str(s.medium),
      small: ab2str(s.small)
    }
  }

  expect(checkable(spiralA)).toEqual(checkable(spiralB))
}
