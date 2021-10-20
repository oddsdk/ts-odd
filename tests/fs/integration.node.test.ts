import expect from "expect"

import { loadCAR } from "../helpers/loadCAR.js"

import "../../src/setup/node.js"
import FileSystem from "../../src/fs/filesystem.js"
import { File } from "../../src/fs/types.js"
import * as path from "../../src/path.js"
import * as identifiers from "../../src/common/identifiers.js"
import * as crypto from "../../src/crypto/index.js"
import { ipfsFromContext } from "../mocha-hook.js"


describe("the filesystem", () => {

  it("can load filesystem fixtures", async function () {
    const ipfs = ipfsFromContext(this)
    const { roots } = await loadCAR("tests/fixtures/webnative-integration-test-v1-0-1.car", ipfs)
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
