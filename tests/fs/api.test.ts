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
  ipfs = await createInMemoryIPFS()
  ipfsConfig.set(ipfs)
})

afterAll(async () => {
  if (ipfs === null) return
  await ipfs.stop()
})

fc.configureGlobal({ numRuns: 10 }) 

describe("the filesystem api", () => {
  describe("operates on the private filesystem to", () => {
    it("write files", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), privateFileContent()), async data => {
            const filepath = path.file("private", data[0])

            await fs.write(filepath, data[1])

            expect(await fs.exists(filepath)).toEqual(true)
          })
      )
    })

    it("remove what it writes", async () => {
      const fs = await emptyFilesystem()
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), privateFileContent()), async data => {
            const filepath = path.file("private", data[0])

            await fs.write(filepath, data[1])
            await fs.rm(filepath)

            expect(await fs.exists(filepath)).toEqual(false)
          })
      )
    })

    it("read files it writes", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), privateFileContent()), async data => {
            const filepath = path.file("private", data[0])

            await fs.write(filepath, data[1])

            expect(await fs.read(filepath)).toEqual(data[1])
          })
      )
    })

    it("moves files", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegmentPair(), privateFileContent()), async data => {
            const fromPath = path.file("private", data[0][0])
            const toPath = path.file("private", data[0][1])

            await fs.write(fromPath, data[1])
            await fs.mv(fromPath, toPath)
            const fromExists = await fs.exists(fromPath)
            const toExists = await fs.exists(toPath)

            expect(toExists && !fromExists).toEqual(true)
          })
      )
    })

    it("reads moved files", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegmentPair(), privateFileContent()), async data => {
            const fromPath = path.file("private", data[0][0])
            const toPath = path.file("private", data[0][1])

            await fs.write(fromPath, data[1])
            await fs.mv(fromPath, toPath)

            expect(await fs.read(toPath)).toEqual(data[1])
          })
      )
    })

    it("make directories", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          pathSegment(), async data => {
            const dirpath = path.directory("private", data[0])

            await fs.mkdir(dirpath)

            expect(await fs.exists(dirpath)).toEqual(true)
          })
      )
    })

    it("removes directories it makes", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          pathSegment(), async data => {
            const dirpath = path.directory("private", data[0])

            await fs.mkdir(dirpath)
            await fs.rm(dirpath)

            expect(await fs.exists(dirpath)).toEqual(false)
          })
      )
    })

    it("writes files to a directory", async () => {
      const fs = await emptyFilesystem()
      const dirpath = path.directory("private", "testDir")
      await fs.mkdir(dirpath)

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), privateFileContent()), async data => {
            const filepath = path.file("private", "testDir", data[0])

            await fs.write(filepath, data[1])

            expect(await fs.exists(filepath)).toEqual(true)
          })
      )
    })

    it("lists files written to a directory", async () => {
      const fs = await emptyFilesystem()
      const dirpath = path.directory("private", "testDir")
      await fs.mkdir(dirpath)

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), privateFileContent()), async data => {
            const filepath = path.file("private", "testDir", data[0])

            await fs.write(filepath, data[1])
            const listing = await fs.ls(dirpath)

            expect(data[0] in listing).toEqual(true)
          })
      )
    })

    it("moves files into a directory", async () => {
      const fs = await emptyFilesystem()
      const dirpath = path.directory("private", "testDir")
      await fs.mkdir(dirpath)

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegmentPair(), privateFileContent()), async data => {
            const fromPath = path.file("private", data[0][0])
            const toPath = path.file("private", "testDir", data[0][1])

            await fs.write(fromPath, data[1])
            await fs.mv(fromPath, toPath)
            const fromExists = await fs.exists(fromPath)
            const toExists = await fs.exists(toPath)

            expect(toExists && !fromExists).toEqual(true)
          })
      )
    })
  })


  describe("operates on the public filesystem to",() => {
    it("write files", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), publicFileContent()), async data => {
            const filepath = path.file("public", data[0])

            await fs.write(filepath, data[1])

            expect(await fs.exists(filepath)).toEqual(true)
          })
      )
    })

    it("remove files it writes", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), publicFileContent()), async data => {
            const filepath = path.file("public", data[0])

            await fs.write(filepath, data[1])
            await fs.rm(filepath)

            expect(await fs.exists(filepath)).toEqual(false)
          })
      )
    })

    it("read files it writes", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), publicFileContent()), async data => {
            const filepath = path.file("public", data[0])

            await fs.write(filepath, data[1])

            expect(await fs.read(filepath)).toEqual(data[1])
          })
      )
    })

    it("moves files", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegmentPair(), publicFileContent()), async data => {
            const fromPath = path.file("public", data[0][0])
            const toPath = path.file("public", data[0][1])

            await fs.write(fromPath, data[1])
            await fs.mv(fromPath, toPath)
            const fromExists = await fs.exists(fromPath)
            const toExists = await fs.exists(toPath)

            expect(toExists && !fromExists).toEqual(true)
          })
      )
    })

    it("reads moved files", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegmentPair(), publicFileContent()), async data => {
            const fromPath = path.file("public", data[0][0])
            const toPath = path.file("public", data[0][1])

            await fs.write(fromPath, data[1])
            await fs.mv(fromPath, toPath)

            expect(await fs.read(toPath)).toEqual(data[1])
          })
      )
    })

    it("make directories", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          pathSegment(), async data => {
            const dirpath = path.directory("public", data[0])

            await fs.mkdir(dirpath)

            expect(await fs.exists(dirpath)).toEqual(true)
          })
      )
    })

    it("removes directories it makes", async () => {
      const fs = await emptyFilesystem()

      await fc.assert(
        fc.asyncProperty(
          pathSegment(), async data => {
            const dirpath = path.directory("public", data[0])

            await fs.mkdir(dirpath)
            await fs.rm(dirpath)

            expect(await fs.exists(dirpath)).toEqual(false)
          })
      )
    })

    it("writes files to a directory", async () => {
      const fs = await emptyFilesystem()
      const dirpath = path.directory("public", "testDir")
      await fs.mkdir(dirpath)

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), publicFileContent()), async data => {
            const filepath = path.file("public", "testDir", data[0])

            await fs.write(filepath, data[1])

            expect(await fs.exists(filepath)).toEqual(true)
          })
      )
    })

    it("lists files written to a directory", async () => {
      const fs = await emptyFilesystem()
      const dirpath = path.directory("public", "testDir")
      await fs.mkdir(dirpath)

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegment(), publicFileContent()), async data => {
            const filepath = path.file("public", "testDir", data[0])

            await fs.write(filepath, data[1])
            const listing = await fs.ls(dirpath)

            expect(data[0] in listing).toEqual(true)
          })
      )
    })

    it("moves files into a directory", async () => {
      const fs = await emptyFilesystem()
      const dirpath = path.directory("public", "testDir")
      await fs.mkdir(dirpath)

      await await fc.assert(
        fc.asyncProperty(
          fc.tuple(pathSegmentPair(), publicFileContent()), async data => {
            const fromPath = path.file("public", data[0][0])
            const toPath = path.file("public", "testDir", data[0][1])

            await fs.write(fromPath, data[1])
            await fs.mv(fromPath, toPath)
            const fromExists = await fs.exists(fromPath)
            const toExists = await fs.exists(toPath)

            expect(toExists && !fromExists).toEqual(true)
          })
      )
    })
  })
})


/* Helpers */

const emptyFilesystem = async () => {
  rootKey = await crypto.aes.genKeyStr()
  return FileSystem.empty({
    localOnly: true,
    permissions: {
      fs: {
        public: [path.root()],
        private: [path.root()]
      }
    },
    rootKey
  })
}

const pathSegment = () => {
  return fc.hexaString({ minLength: 1, maxLength: 20 })
}

const pathSegmentPair = () => {
  return fc.set(
    fc.hexaString({ minLength: 1, maxLength: 20 }),
    {minLength: 2, maxLength: 2}
  )
}

const privateFileContent = () => {
  return fc.frequency(
    { arbitrary: simpleContent(), weight: 10 },
    { arbitrary: bufferContent(), weight: 1 },
    { arbitrary: recordContent(), weight: 1 }
  )
}

const publicFileContent = () => {
  return fc.frequency(
    { arbitrary: simpleContent(), weight: 10 },
    { arbitrary: bufferContent(), weight: 1 }
  )
}

const simpleContent = () => {
  return fc.frequency(
    { arbitrary: fc.json(), weight: 10 },
    { arbitrary: fc.string({ minLength: 1}), weight: 5 },
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