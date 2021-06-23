import * as fc from 'fast-check'

import { IPFS } from 'ipfs-core'
import { createInMemoryIPFS } from '../helpers/in-memory-ipfs'

import * as ipfsConfig from '../../src/ipfs'
import * as path from '../../src/path'

import { pathSegment, pathSegmentPair } from '../helpers/paths'
import { emptyFilesystem } from '../helpers/filesystem'
import { publicFileContent as fileContent, publicDecode as decode } from '../helpers/fileContent'


let ipfs: IPFS | null = null

beforeAll(async () => {
  ipfs = await createInMemoryIPFS()
  ipfsConfig.set(ipfs)
})

afterAll(async () => {
  if (ipfs === null) return
  await ipfs.stop()
})

fc.configureGlobal(process.env.TEST_ENV === 'gh-action' ? { numRuns: 100 } : { numRuns: 10 })

describe('the filesystem api', () => {
  it('writes files', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = path.file('public', pathSegment)

          await fs.write(filepath, fileContent.val)

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it('removes files it writes', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = path.file('public', pathSegment)

          await fs.write(filepath, fileContent.val)
          await fs.rm(filepath)

          expect(await fs.exists(filepath)).toEqual(false)
        })
    )
  })

  it('reads files it writes', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = path.file('public', pathSegment)

          await fs.write(filepath, fileContent.val)
          const file = await fs.read(filepath)
          const decodedContent = decode(file, fileContent.type)

          expect(decodedContent).toEqual(fileContent.val)
        })
    )
  })

  it('moves files', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = path.file('public', pathSegmentPair.first)
          const toPath = path.file('public', pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
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
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = path.file('public', pathSegmentPair.first)
          const toPath = path.file('public', pathSegmentPair.second)


          await fs.write(fromPath, fileContent.val)
          await fs.mv(fromPath, toPath)

          const file = await fs.read(toPath)
          const decodedContent = decode(file, fileContent.type)

          expect(decodedContent).toEqual(fileContent.val)
        })
    )
  })

  it('makes directories', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async pathSegment => {
          const dirpath = path.directory('public', pathSegment)

          await fs.mkdir(dirpath)

          expect(await fs.exists(dirpath)).toEqual(true)
        }),
      { numRuns: 100 }
    )
  })

  it('removes directories it makes', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        pathSegment(), async pathSegment => {
          const dirpath = path.directory('public', pathSegment)

          await fs.mkdir(dirpath)
          await fs.rm(dirpath)

          expect(await fs.exists(dirpath)).toEqual(false)
        })
    )
  })

  it('writes files to a directory', async () => {
    const fs = await emptyFilesystem()

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = path.file('public', pathSegment)

          await fs.write(filepath, fileContent.val)

          expect(await fs.exists(filepath)).toEqual(true)
        })
    )
  })

  it('lists files written to a directory', async () => {
    const fs = await emptyFilesystem()
    const dirpath = path.directory('public', 'testDir')
    await fs.mkdir(dirpath)

    await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegment: pathSegment(), fileContent: fileContent() }),
        async ({ pathSegment, fileContent }) => {
          const filepath = path.file('public', 'testDir', pathSegment)

          await fs.write(filepath, fileContent.val)
          const listing = await fs.ls(dirpath)

          expect(pathSegment in listing).toEqual(true)
        })
    )
  })

  it('moves files into a directory', async () => {
    const fs = await emptyFilesystem()
    const dirpath = path.directory('public', 'testDir')
    await fs.mkdir(dirpath)

    await await fc.assert(
      fc.asyncProperty(
        fc.record({ pathSegmentPair: pathSegmentPair(), fileContent: fileContent() }),
        async ({ pathSegmentPair, fileContent }) => {
          const fromPath = path.file('public', pathSegmentPair.first)
          const toPath = path.file('public', pathSegmentPair.second)

          await fs.write(fromPath, fileContent.val)
          await fs.mv(fromPath, toPath)
          const fromExists = await fs.exists(fromPath)
          const toExists = await fs.exists(toPath)

          expect(toExists && !fromExists).toEqual(true)
        })
    )
  })
})