import expect from "expect"
import * as fc from "fast-check"

import * as ratchet from "./spiralratchet.js"
import { isCI, canonicalize } from "../../../../tests/helpers/common.js"


describe("the spiral ratchet module", () => {

  describe("next65536Epoch", () => {
    it("has the property that next65536Epoch rounds up to the next large zero", async () => {
      const spiral = await ratchet.setup()
      const slow = await iterateAsync(spiral, s => ratchet.nextMediumEpoch(s), 256 - spiral.mediumCounter)
      const fast = await ratchet.nextLargeEpoch(spiral)
      expect(canonicalize(slow)).toEqual(canonicalize(fast))
    })
  })

  describe("next256Epoch", () => {
    it("rounds up to the next medium zero", async () => {
      const spiral = await ratchet.setup()
      const fast = await ratchet.nextMediumEpoch(spiral)
      const slow = await iterateAsync(spiral, s => ratchet.inc(s), 256 - spiral.smallCounter)
      expect(canonicalize(fast)).toEqual(canonicalize(slow))
    })
  })

  describe("incBy", () => {

    it("is backwards secret by always changing (appropriate) digits when increasing", async () => {
      const exampleOptions = {
        seed: new TextEncoder().encode("hello world").buffer,
        preIncrementSmall: 0,
        preIncrementMedium: 0,
      }
      await fc.assert(fc.asyncProperty(
        fc.nat({ max: 999999 }).map(n => n + 1),
        arbitraryRatchetOptions(),
        async (iterations, options) => {
          const initial = await ratchet.setup(options)
          const increased = await ratchet.incBy(initial, iterations)

          // the small digit must always change
          // (it doesn't work like 123 + 20 = 143, where 1 and 3 didn't change)
          expect(canonicalize(increased.small)).not.toEqual(canonicalize(initial.small))

          if (iterations < 256) return
          expect(canonicalize(increased.medium)).not.toEqual(canonicalize(initial.medium))

          if (iterations < 256 * 256) return
          expect(canonicalize(increased.large)).not.toEqual(canonicalize(initial.large))
        }
      ), {
        examples: [ // Especially test the boundaries
          [1, exampleOptions],
          [256, exampleOptions],
          [256*2, exampleOptions],
          [256*256, exampleOptions],
          [256*256*2, exampleOptions],
        ]
      })
    })

    it("is backwards secret by always producing a different key when increasing", async () => {
      const exampleOptions = {
        seed: new TextEncoder().encode("hello world").buffer,
        preIncrementSmall: 0,
        preIncrementMedium: 0,
      }
      await fc.assert(fc.asyncProperty(
        fc.nat({ max: 999999 }).map(n => n + 1),
        arbitraryRatchetOptions(),
        async (iterations, options) => {
          const initial = await ratchet.setup(options)
          const increased = await ratchet.incBy(initial, iterations)
          expect(canonicalize(await ratchet.toKey(increased)))
            .not.toEqual(canonicalize(await ratchet.toKey(initial)))
        }
      ), {
        examples: [ // Especially test the boundaries
          [1, exampleOptions],
          [256, exampleOptions],
          [256*2, exampleOptions],
          [256*256, exampleOptions],
          [256*256*2, exampleOptions],
        ]
      })
    })

    const test = (iters: number, preIncrementSmall: number, preIncrementMedium: number) => {
      it(`has the property incBy ${iters} = ${iters} * inc`, async () => {
        const spiral = await ratchet.setup({
          seed: new TextEncoder().encode("hello world").buffer,
          preIncrementSmall,
          preIncrementMedium, 
        })
        const positional = await ratchet.incBy(spiral, iters)
        const unary = await iterateAsync(spiral, s => ratchet.inc(s), iters)
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
            const spiral = await ratchet.setup(options)
            const positional = await ratchet.incBy(spiral, iters)
            const unary = await iterateAsync(spiral, s => ratchet.inc(s), iters)
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
            const initial = await ratchet.setup(options)
            let stepped = initial
            for (const iters of iterations.array) {
              stepped = await ratchet.incBy(stepped, iters)
            }
            const jumped = await ratchet.incBy(initial, iterations.total)
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
    preIncrementMedium: fc.nat({ max: 255 }),
    preIncrementSmall: fc.nat({ max: 255 }),
  })
}