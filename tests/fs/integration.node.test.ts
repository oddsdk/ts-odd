import expect from "expect"

import { loadCARWithRoot } from "../helpers/loadCAR.js"

import "../../src/setup/node.js"
import FileSystem from "../../src/fs/filesystem.js"
import { File } from "../../src/fs/types.js"
import * as path from "../../src/path.js"

import { ipfsFromContext } from "../mocha-hook.js"
import { loadFilesystem } from "../helpers/filesystem.js"


describe("the filesystem", () => {

  it("can load filesystem fixtures", async function () {
    const ipfs = ipfsFromContext(this)

    const rootCID = await loadCARWithRoot("tests/fixtures/webnative-integration-test-v1-0-1.car", ipfs)
    const readKey = "pJW/xgBGck9/ZXwQHNPhV3zSuqGlUpXiChxwigwvUws="
    const fs = await loadFilesystem(rootCID.toString(), readKey)

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
