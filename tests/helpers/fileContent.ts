import * as fc from "fast-check"

import { FileContent } from "../../src/ipfs/types.js"

const utf8decoder = new TextDecoder()

/** Public and Private file content */

type PublicFileContent =
  fc.Arbitrary<
    { type: string; val: string } |
    { type: string; val: number } |
    { type: string; val: boolean } |
    { type: string; val: Uint8Array }
  >

export const publicFileContent: () => PublicFileContent = () => {
  return fc.frequency(
    { arbitrary: simpleContent(), weight: 9 },
    { arbitrary: rawFileContent(), weight: 1 },
  )
}

type PrivateFileContent =
  fc.Arbitrary<
    { type: string; val: string } |
    { type: string; val: number } |
    { type: string; val: boolean } |
    { type: string; val: Uint8Array } |
    {
      type: string
      val: {
        key: string
        value:
        { type: string; val: string } |
        { type: string; val: number } |
        { type: string; val: boolean }
      }
    }
  >

export const privateFileContent: () => PrivateFileContent = () => {
  return fc.frequency(
    { arbitrary: simpleContent(), weight: 10 },
    { arbitrary: rawFileContent(), weight: 1 },
    { arbitrary: recordContent(), weight: 1 }
  )
}

/** File content generators */

const simpleContent = () => {
  return fc.frequency(
    { arbitrary: fc.record({ type: fc.constant('string'), val: fc.json() }), weight: 6 },
    { arbitrary: fc.record({ type: fc.constant('string'), val: fc.string() }), weight: 4 },
    { arbitrary: fc.record({ type: fc.constant('number'), val: fc.integer() }), weight: 2 },
    { arbitrary: fc.record({ type: fc.constant('number'), val: fc.double() }), weight: 2 },
    { arbitrary: fc.record({ type: fc.constant('boolean'), val: fc.boolean() }), weight: 1 }
  )
}

const rawFileContent = () => {
  return fc.record({ type: fc.constant('rawFileContent'), val: fc.uint8Array({ minLength: 1 }) })
}

const recordContent = () => {
  return fc.record({
    type: fc.constant('record'),
    val: fc.record({
      key: fc.string({ minLength: 1, maxLength: 20 }),
      value: simpleContent()
    }),
  })
}

/** Decoders */

export const publicDecode: (file: FileContent, type: string) => FileContent = (file, type) => {
  switch (type) {
    case 'string':
      return utf8decoder.decode(file as BufferSource)

    case 'number':
      return +utf8decoder.decode(file as BufferSource)

    case 'boolean':
      if (utf8decoder.decode(file as BufferSource) === 'true') {
        return true
      } else if (utf8decoder.decode(file as BufferSource) === 'false') {
        return false
      } else {
        return `Invalid boolean string: ${utf8decoder.decode(file as BufferSource)}`
      }

    case 'rawFileContent':
      return Uint8Array.from(file as Buffer)

    default:
      return `Invalid type: ${type}`
  }
}

export const privateDecode: (file: FileContent, type: string) => FileContent = (file, type) => {
  switch (type) {
    case 'rawFileContent':
      return Uint8Array.from(file as Buffer)

    default:
      return file
  }
}