import expect from "expect"
import * as fc from "fast-check"

import * as ratchet from "./spiralratchet.js"
import { getCrypto } from "./context.js"
import { isCI, canonicalize } from "../../../../tests/helpers/common.js"


describe("the spiral ratchet module", () => {

  const ctx = getCrypto()

  describe("complement", () => {
    it("has the property complement(complement(x)) = x", () => {
      fc.assert(
        fc.property(fc.uint8Array(), arr => {
          expect(new Uint8Array(ratchet.complement(ratchet.complement(arr.buffer))))
            .toEqual(arr)
        })
      )
    })

    it("has the property complement(x) != x, except empty x", () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 1 }), arr => {
          expect(new Uint8Array(ratchet.complement(arr.buffer)))
            .not.toEqual(arr)
        })
      )
    })
  })

  describe("next65536Epoch", () => {
    it("has the property that next65536Epoch rounds up to the next large zero", async () => {
      const spiral = await ratchet.setup(ctx)
      const slow = await iterateAsync(spiral, s => ratchet.nextMediumEpoch(s, ctx), 256 - spiral.mediumCounter)
      const fast = await ratchet.nextLargeEpoch(spiral, ctx)
      expect(canonicalize(slow)).toEqual(canonicalize(fast))
    })
  })

  describe("next256Epoch", () => {
    it("rounds up to the next medium zero", async () => {
      const spiral = await ratchet.setup(ctx)
      const fast = await ratchet.nextMediumEpoch(spiral, ctx)
      const slow = await iterateAsync(spiral, s => ratchet.inc(s, ctx), 256 - spiral.smallCounter)
      expect(canonicalize(fast)).toEqual(canonicalize(slow))
    })
  })

  describe("incBy", () => {

    it("has the property incBy n != identity for any n >= 1", async () => {
      await fc.assert(fc.asyncProperty(
        fc.nat({ max: 999999 }).map(n => n + 1),
        arbitraryRatchetOptions(),
        async (iterations, options) => {
          const initial = await ratchet.setup({ ...ctx, ...options })
          const increased = await ratchet.incBy(initial, iterations, ctx)
          if (canonicalize(increased.large) === canonicalize(initial.large)) {
            if (canonicalize(increased.medium) === canonicalize(increased.medium)) {
              expect(canonicalize(initial.small)).not.toEqual(canonicalize(increased.small))
              return
            }
            expect(canonicalize(initial.medium)).not.toEqual(canonicalize(increased.medium))
            return
          }
          expect(canonicalize(initial.large)).not.toEqual(canonicalize(increased.large))
        }
      ))
    })

    const test = (iters: number, smallOffset: number, mediumOffset: number) => {
      it(`has the property incBy ${iters} = ${iters} * inc`, async () => {
        const spiral = await ratchet.setup({
          ...ctx,
          seed: new TextEncoder().encode("hello world").buffer,
          ffSmall: smallOffset,
          ffMedium: mediumOffset
        })
        const positional = await ratchet.incBy(spiral, iters, ctx)
        const unary = await iterateAsync(spiral, s => ratchet.inc(s, ctx), iters)
        expect(canonicalize(positional)).toEqual(canonicalize(unary))
      })
    }

    context("not along rollover point", () => {
      context("no change", () => test(0, 0, 0))
      context("small change", () => test(8, 0, 0))
      context("medium change", () => test(450, 0, 0))
      context("large change", () => test(70000, 0, 0))
      if (isCI()) {
        context("huge change", () => test(999999, 0, 0))
      }
    })

    context("near rollover point", () => {
      context("no change", () => test(0, 255, 255))
      context("small change", () => test(8, 255, 255))
      context("medium change", () => test(450, 255, 255))
      context("large change", () => test(70000, 255, 255))
      if (isCI()) {
        context("huge change", () => test(999999, 255, 255))
      }
    })

    context("prop change", () => {
      it("works with any number of iterations", async () => {
        await fc.assert(fc.asyncProperty(
          fc.nat({ max: 100000 }),
          arbitraryRatchetOptions(),
          async (iters, options) => {
            const spiral = await ratchet.setup({ ...ctx, ...options })
            const positional = await ratchet.incBy(spiral, iters, ctx)
            const unary = await iterateAsync(spiral, s => ratchet.inc(s, ctx), iters)
            expect(canonicalize(positional)).toEqual(canonicalize(unary))
          }
        ), { numRuns: 10 }) // running 70k iterations takes ~3 seconds
      })

      it("works with any combinations of incBy that sum to the same value", async () => {
        await fc.assert(fc.asyncProperty(
          fc.array(fc.nat({ max: 1000 }), { maxLength: 70 }).map(iterationsArray => ({
            array: iterationsArray,
            total: iterationsArray.reduce((a, b) => a + b, 0)
          })),
          arbitraryRatchetOptions(),
          async (iterations, options) => {
            const initial = await ratchet.setup({ ...ctx, ...options })
            let stepped = initial
            for (const iters of iterations.array) {
              stepped = await ratchet.incBy(stepped, iters, ctx)
            }
            const jumped = await ratchet.incBy(initial, iterations.total, ctx)
            expect(canonicalize(stepped)).toEqual(canonicalize(jumped))
          })
        )
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

function arbitraryRatchetOptions(): fc.Arbitrary<ratchet.RatchetOptions> {
  return fc.record({
    seed: fc.uint8Array().map(arr => arr.buffer),
    ffMedium: fc.nat({ max: 255 }),
    ffSmall: fc.nat({ max: 255 }),
  })
}