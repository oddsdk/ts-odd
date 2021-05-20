import { IPFS } from 'ipfs-core'

import { loadCAR } from '../helpers/loadCAR'
import { createInMemoryIPFS } from '../helpers/in-memory-ipfs'

import FileSystem from '../../src/fs/filesystem'
import { File } from '../../src/fs/types'
import * as ipfsConfig from '../../src/ipfs'
import * as path from '../../src/path'
import * as identifiers from '../../src/common/identifiers'
import * as crypto from '../../src/crypto'


let ipfs: IPFS | null = null

beforeAll(async () => {
  ipfs = await createInMemoryIPFS()
  ipfsConfig.set(ipfs)
})

afterAll(async () => {
  if (ipfs == null) return
  await ipfs.stop()
})


describe("the filesystem", () => {
  it("can load filesystem fixtures", async () => {
    const cids = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs)
    const rootCID = cids[0]
    globalThis.cids = cids.map(cid => cid.toString())

    const readKey = "pJW/xgBGck9/ZXwQHNPhV3zSuqGlUpXiChxwigwvUws="
    await crypto.keystore.importSymmKey(readKey, await identifiers.readKey({ path: path.directory("private") }))

    const fs = await FileSystem.fromCID(rootCID.toString(), {
      localOnly: true,
      permissions: {
        fs: {
          public: [path.root()],
          private: [path.root()]
        }
      }
    })

    const files = await listFiles(fs, path.root())

    expect(files).not.toEqual([])
  })
})

async function listFiles(fs: FileSystem, searchPath: path.DirectoryPath): Promise<File[]> {
  let files: File[] = []
  for (const [subName, sub] of Object.entries(await fs.ls(searchPath))) {
    if (sub.isFile) {
      const file = await fs.get(path.combine(searchPath, path.file(subName))) as File
      files.push(file)
    } else {
      const subFiles = await listFiles(fs, path.combine(searchPath, path.directory(subName)) as path.DirectoryPath)
      files = files.concat(subFiles)
    }
  }
  return files
}
