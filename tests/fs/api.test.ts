import * as fc from 'fast-check'

import { IPFS } from 'ipfs-core'
import { createInMemoryIPFS } from '../helpers/in-memory-ipfs'
import FileSystem from '../../src/fs/filesystem'

import * as ipfsConfig from '../../src/ipfs'
import * as path from '../../src/path'
import * as crypto from '../../src/crypto'


let ipfs: IPFS | null = null
let rootKey: string

beforeAll(async () => {
  rootKey = await crypto.aes.genKeyStr()
  ipfs = await createInMemoryIPFS()
  ipfsConfig.set(ipfs)
})

afterAll(async () => {
  if (ipfs === null) return
  await ipfs.stop()
})

describe("the filesystem api", () => {
  let fs: FileSystem

  beforeEach(async () => {
    fs = await FileSystem.empty({
      localOnly: true,
      permissions: {
        fs: {
          public: [path.root()],
          private: [path.root()]
        }
      },
      rootKey
    })
  })

  it("writes to private", async () => {
    fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file("private", data[0])
          await fs.write(filepath, data[1])
          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it("removes what it writes to private", async () => {
    fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file("private", data[0])
          await fs.write(filepath, data[1])
          await fs.rm(filepath)
          expect(await fs.exists(filepath)).toEqual(false)
        })
    )
  })

  it("reads what it writes to private", async () => {
    fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file("private", data[0])
          await fs.write(filepath, data[1])
          expect(await fs.read(filepath)).toEqual(data[1])
        })
    )
  })


  it("writes to public", async () => {
    fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file("public", data[0])
          await fs.write(filepath, data[1])
          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it("removes what it writes to public", async () => {
    fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file("public", data[0])
          await fs.write(filepath, data[1])
          await fs.rm(filepath)
          expect(await fs.exists(filepath)).toEqual(false)
        })
    )
  })

  it("reads what it writes to public", async () => {
    fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file("public", data[0])
          await fs.write(filepath, data[1])
          expect(await fs.read(filepath)).toEqual(data[1])
        })
    )
  })
})


/* Helpers */

const pathSegment = () => {
  return fc.hexaString({ minLength: 1, maxLength: 20 })
}

const fileContent = () => {
  return fc.frequency(
    { arbitrary: simpleContent(), weight: 10 },
    { arbitrary: bufferContent(), weight: 1 },
    { arbitrary: recordContent(), weight: 1 },
  )
}

const simpleContent = () => {
  return fc.frequency(
    { arbitrary: fc.json(), weight: 10 },
    { arbitrary: fc.string(), weight: 5 },
    { arbitrary: fc.integer(), weight: 2 },
    { arbitrary: fc.double(), weight: 2 },
    { arbitrary: fc.boolean(), weight: 1 }
  )
}

const recordContent = () => {
  return fc.record({
    key: fc.string({ minLength: 1, maxLength: 20 }),
    value: simpleContent()
  })
}

const bufferContent = () => {
  return fc.oneof(
    fc.int8Array(),
    fc.uint8Array(),
    fc.int16Array(),
    fc.uint16Array(),
    fc.int32Array(),
    fc.uint32Array(),
    fc.float32Array(),
    fc.float64Array()
  ).map(arr => Buffer.from(arr.buffer))
}