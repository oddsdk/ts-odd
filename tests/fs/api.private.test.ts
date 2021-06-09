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

describe('the filesystem api', () => {
  it('write files', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file('private', data[0])
          const [val] = data[1]

          await fs.write(filepath, val)

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it('remove what it writes', async () => {
    const fs = await emptyFilesystem()
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file('private', data[0])
          const [val] = data[1]

          await fs.write(filepath, val)
          await fs.rm(filepath)

          expect(await fs.exists(filepath)).toEqual(false)
        })
    )
  })

  it('read files it writes', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file('private', data[0])
          const [val, type] = data[1]

          await fs.write(filepath, val)
          const file = await fs.read(filepath)
          const content = maybeDecode(file, type)

          expect(content).toEqual(val)
        })
    )
  })

  it('moves files', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegmentPair(), fileContent()), async data => {
          const [from, to] = data[0]
          const [val] = data[1]
          const fromPath = path.file('private', from)
          const toPath = path.file('private', to)

          await fs.write(fromPath, val)
          await fs.mv(fromPath, toPath)
          const fromExists = await fs.exists(fromPath)
          const toExists = await fs.exists(toPath)

          expect(toExists && !fromExists).toEqual(true)
        })
    )
  })

  it('reads moved files', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegmentPair(), fileContent()), async data => {
          const [from, to] = data[0]
          const [val, type] = data[1]
          const fromPath = path.file('private', from)
          const toPath = path.file('private', to)

          await fs.write(fromPath, val)
          await fs.mv(fromPath, toPath)

          const file = await fs.read(toPath)
          const content = maybeDecode(file, type)

          expect(content).toEqual(val)
        })
    )
  })

  it('make directories', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async data => {
          const dirpath = path.directory('private', data[0])

          await fs.mkdir(dirpath)

          expect(await fs.exists(dirpath)).toEqual(true)
        })
    )
  })

  it('removes directories it makes', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async data => {
          const dirpath = path.directory('private', data[0])

          await fs.mkdir(dirpath)
          await fs.rm(dirpath)

          expect(await fs.exists(dirpath)).toEqual(false)
        })
    )
  })

  it('writes files to a directory', async () => {
    const fs = await emptyFilesystem()
    const dirpath = path.directory('private', 'testDir')
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file('private', 'testDir', data[0])
          const [val] = data[1]

          await fs.write(filepath, val)

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it('lists files written to a directory', async () => {
    const fs = await emptyFilesystem()
    const dirpath = path.directory('private', 'testDir')
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegment(), fileContent()), async data => {
          const filepath = path.file('private', 'testDir', data[0])
          const [val] = data[1]

          await fs.write(filepath, val)
          const listing = await fs.ls(dirpath)

          expect(data[0] in listing).toEqual(true)
        })
    )
  })

  it('moves files into a directory', async () => {
    const fs = await emptyFilesystem()
    const dirpath = path.directory('private', 'testDir')
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(pathSegmentPair(), fileContent()), async data => {
          const [from, to] = data[0]
          const [val] = data[1]
          const fromPath = path.file('private', from)
          const toPath = path.file('private', 'testDir', to)

          await fs.write(fromPath, val)
          await fs.mv(fromPath, toPath)
          const fromExists = await fs.exists(fromPath)
          const toExists = await fs.exists(toPath)

          expect(toExists && !fromExists).toEqual(true)
        })
    )
  })
})


/* Filesystem */

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

/* Paths */

const pathSegment = () => {
  return fc.hexaString({ minLength: 1, maxLength: 20 })
}

const pathSegmentPair = () => {
  return fc.set(
    fc.hexaString({ minLength: 1, maxLength: 20 }),
    { minLength: 2, maxLength: 2 }
  )
}

/* File content */

const fileContent = () => {
  return fc.frequency(
    { arbitrary: simpleContent(), weight: 10 },
    { arbitrary: rawFileContent(), weight: 1 },
    { arbitrary: recordContent(), weight: 1 }
  )
}

const simpleContent = () => {
  return fc.frequency(
    { arbitrary: fc.tuple(fc.json(), fc.constant('string')), weight: 10 },
    { arbitrary: fc.tuple(fc.string({ minLength: 1 }), fc.constant('string')), weight: 5 },
    { arbitrary: fc.tuple(fc.integer(), fc.constant('number')), weight: 2 },
    { arbitrary: fc.tuple(fc.double(), fc.constant('number')), weight: 2 },
    { arbitrary: fc.tuple(fc.boolean(), fc.constant('boolean')), weight: 1 }
  )
}

const rawFileContent = () => {
  return fc.tuple(fc.uint8Array({ minLength: 1 }), fc.constant('rawFileContent'))
}

const recordContent = () => {
  return fc.tuple(
    fc.record({
      key: fc.string({ minLength: 1, maxLength: 20 }),
      value: simpleContent()
    }),
    fc.constant('record'))
}

const maybeDecode = (file, type) => {
  switch (type) {
    case 'rawFileContent':
      return Uint8Array.from(file as Buffer)

    default:
      return file
  }
}