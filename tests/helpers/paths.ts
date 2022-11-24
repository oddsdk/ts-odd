import * as fc from "fast-check"

/** Path segment.
 * Cannot be an empty string or contain '/'.
 */

export const pathSegment: () => fc.Arbitrary<string> = () => {
  return fc.hexaString({ minLength: 1, maxLength: 20 })
}

/** Path segment pairs.
 * Members should be unique within the pair, but also across test runs.
 * The minLength four should generate unique paths in most cases, but
 * there may be occassional collisions
 */

export const pathSegmentPair: () => fc.Arbitrary<{ first: string; second: string }> = () => {
  return fc.uniqueArray(
    fc.hexaString({ minLength: 4, maxLength: 20 }),
    { minLength: 2, maxLength: 2 }
  ).map(([ first, second ]) => ({ first, second }))
}