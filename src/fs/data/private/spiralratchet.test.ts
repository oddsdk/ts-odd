import expect from "expect"
import * as fc from "fast-check"
import take from "it-take"
import all from "it-all"

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
          [1, seededRatchet("hello world")],
          [256, seededRatchet("hello world")],
          [256 * 2, seededRatchet("hello world")],
          [256 * 256, seededRatchet("hello world")],
          [256 * 256 * 2, seededRatchet("hello world")],
        ]
      })
    })

    it("is backwards secret by always producing a different key when increasing", async () => {
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
          [1, seededRatchet("hello world")],
          [256, seededRatchet("hello world")],
          [256 * 2, seededRatchet("hello world")],
          [256 * 256, seededRatchet("hello world")],
          [256 * 256 * 2, seededRatchet("hello world")],
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

  describe("seek", () => {

    it("has the property seek(ratchet, i => i <= n).increasedBy == n", async () => {
      await fc.assert(fc.asyncProperty(
        fc.nat({ max: 1000000 }),
        arbitraryRatchetOptions(),
        async (n, options) => {
          const spiral = await ratchet.setup(options)
          const seeked = await ratchet.seek(spiral, async ({ increasedBy }) => increasedBy <= n)
          expect(seeked.increasedBy).toEqual(n)
        }
      ), { numRuns: 20 })
    })

    it("has the property seek(ratchet, i => i <= n).ratchet == incBy(ratchet, n)", async () => {
      await fc.assert(fc.asyncProperty(
        fc.nat({ max: 1000000 }),
        arbitraryRatchetOptions(),
        async (n, options) => {
          const spiral = await ratchet.setup(options)
          const positional = await ratchet.incBy(spiral, n)
          const seeked = await ratchet.seek(spiral, async ({ increasedBy }) => increasedBy <= n)
          expect(canonicalize(seeked.ratchet)).toEqual(canonicalize(positional))
        }
      ), { numRuns: 20 })
    })

    it("generates valid ratchet and increasedBy combinations on seek", async () => {
      await fc.assert(fc.asyncProperty(
        fc.nat({ max: 10000 }),
        arbitraryRatchetOptions(),
        async (n, options) => {
          const spiral = await ratchet.setup(options)

          // build next n ratchets
          const spirals = new Array(n)
          let current = spiral
          for (let i = 0; i < n; i++) {
            spirals[i] = current
            current = await ratchet.inc(current)
          }

          // check that a seek actually generated the expected ratchet
          async function checkSeek(seek: ratchet.SpiralSeek) {
            if (spirals[seek.increasedBy] == null) return
            expect(canonicalize(seek)).toEqual(canonicalize({
              ratchet: spirals[seek.increasedBy],
              increasedBy: seek.increasedBy
            }))
          }

          // check all seeks we can get our hands on
          await checkSeek(await ratchet.seek(spiral, async seek => {
            await checkSeek(seek)
            return seek.increasedBy <= n
          }))
        }
      ), { numRuns: 20 })
    })

  })

  describe("compare", () => {
    
    const max = 100000
    // maximum number of large digit steps needed to compare 0 and 100k plus some padding
    const maxSteps = max / 256 / 256 + 2

    it("has the property compare(incBy(ratchet, n), incBy(ratchet, m)) == n - m", async () => {
      await fc.assert(fc.asyncProperty(
        fc.nat({ max }),
        fc.nat({ max }),
        arbitraryRatchetOptions(),
        async (n, m, options) => {
          const spiral = await ratchet.setup(options)
          const increasedN = await ratchet.incBy(spiral, n)
          const increasedM = await ratchet.incBy(spiral, m)
          expect(await ratchet.compare(increasedN, increasedM, maxSteps)).toEqual(n - m)
        }
      ))
    })

    it("will report unknown when the ratchets are unrelated", async () => {
      await fc.assert(fc.asyncProperty(
        arbitraryRatchetOptions(),
        arbitraryRatchetOptions(),
        async (ratchet1, ratchet2) => {
          const spiral1 = await ratchet.setup(ratchet1)
          const spiral2 = await ratchet.setup(ratchet2)
          expect(await ratchet.compare(spiral1, spiral2, 100)).toEqual("unknown")
        }
      ))
    })

  })

  describe("ratchet previous", () => {

    it("first returns the second to most recent ratchet", async () => {
      await fc.assert(fc.asyncProperty(
        fc.nat({ max: 1000000 }),
        arbitraryRatchetOptions(),
        async (n, options) => {
          const initial = await ratchet.setup(options)
          const increasedN = await ratchet.incBy(initial, n)
          const increasedNPlusOne = await ratchet.inc(increasedN)
          const previous = await ratchet.previous(increasedNPlusOne, initial).next()
          expect(previous.done || false).toEqual(false)
          expect(canonicalize(previous.value)).toEqual(canonicalize(increasedN))
        }
      ))
    })

    it("has the property previous(incBy(n, ratchet), ratchet) == ratchet+n-1,ratchet+n-2,...,ratchet", async () => {
      await fc.assert(fc.asyncProperty(
        fc.nat({ max: 10000 }).map(m => m + 1),
        arbitraryRatchetOptions(),
        async (n, options) => {
          const initial = await ratchet.setup(options)
          const nextRatchets = await ratchet.nextN(initial, n)
          const increasedN = nextRatchets[nextRatchets.length - 1]
          const expectedPrevious = [initial, ...nextRatchets.slice(0, -1)].reverse()
          const previous = await all(ratchet.previous(increasedN, initial))
          expect(previous.length).toEqual(expectedPrevious.length)
          expect(canonicalize(previous)).toEqual(canonicalize(expectedPrevious))
        }
      ), {
        numRuns: isCI() ? 100 : 10
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

function seededRatchet(seed: string, preIncrementSmall = 0, preIncrementMedium = 0): ratchet.RatchetOptions {
  return {
    seed: new TextEncoder().encode(seed).buffer,
    preIncrementSmall,
    preIncrementMedium,
  }
}
