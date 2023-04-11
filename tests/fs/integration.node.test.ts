import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import { loadCARWithRoot } from "../helpers/loadCAR.js"

import * as Path from "../../src/path/index.js"
import { File } from "../../src/fs/types.js"
import FileSystem from "../../src/fs/filesystem.js"

import { loadFilesystem } from "../helpers/filesystem.js"
import { isSoftLink } from "../../src/fs/types/check.js"


describe("the filesystem", () => {

  it("can load filesystem fixtures", async function () {
    const rootCID = await loadCARWithRoot("tests/fixtures/odd-integration-test-v2-0-0.car")
    const readKey = Uint8arrays.fromString("pJW/xgBGck9/ZXwQHNPhV3zSuqGlUpXiChxwigwvUws=", "base64pad")
    const fs = await loadFilesystem(rootCID, readKey)

    let files = await listFiles(fs, Path.directory("private"))
    files = files.concat(await listFiles(fs, Path.directory("private")))

    expect(files).not.toEqual([])
  })
})

async function listFiles(fs: FileSystem, searchPath: Path.Directory<Path.Partitioned<Path.Partition>>): Promise<File[]> {
  let files: File[] = []
  for (const [ subName, sub ] of Object.entries(await fs.ls(searchPath))) {
    if (isSoftLink(sub)) continue
    if (sub.isFile) {
      const file = await fs.get(Path.combine(searchPath, Path.file(subName))) as File
      files.push(file)
    } else {
      const subFiles = await listFiles(fs, Path.combine(searchPath, Path.directory(subName)))
      files = files.concat(subFiles)
    }
  }
  return files
}
