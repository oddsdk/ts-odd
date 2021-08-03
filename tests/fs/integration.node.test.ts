import expect from "expect"
import { CID, IPFS } from "ipfs-core"
import * as uint8arrays from "uint8arrays"

import { loadCAR } from "../helpers/loadCAR.js"
import { createInMemoryIPFS } from "../helpers/in-memory-ipfs.js"

import "../../src/setup/node.js"
import FileSystem from "../../src/fs/filesystem.js"
import { File } from "../../src/fs/types.js"
import * as ipfsConfig from "../../src/ipfs/index.js"
import * as path from "../../src/path.js"
import * as identifiers from "../../src/common/identifiers.js"
import * as crypto from "../../src/crypto/index.js"


describe("the filesystem", () => {

  let ipfs: IPFS | null = null

  before(async function () {
    ipfs = await createInMemoryIPFS()
    ipfsConfig.set(ipfs)
  })

  after(async () => {
    if (ipfs == null) return
    await ipfs.stop()
  })


  it("can load filesystem fixtures", async () => {
    const { roots } = await loadCAR("tests/fixtures/webnative-integration-test.car", ipfs as IPFS)
    const [rootCID] = roots
    expect(rootCID).toBeDefined()

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

    if (fs == null) {
      expect(fs).not.toBe(null)
      return
    }

    let files = await listFiles(fs, path.directory("public"))
    files = files.concat(await listFiles(fs, path.directory("private")))

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
