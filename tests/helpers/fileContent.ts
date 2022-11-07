import * as fc from "fast-check"


/** Public and Private file content */

type FileContent =
  fc.Arbitrary<
    { type: string; val: Uint8Array }
  >

export const fileContent: () => FileContent = () => {
  return fc.oneof(
    { arbitrary: rawFileContent(), weight: 1 },
  )
}

/** File content generators */

const rawFileContent = () => {
  return fc.record({ type: fc.constant("rawFileContent"), val: fc.uint8Array({ minLength: 1 }) })
}
