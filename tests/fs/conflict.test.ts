import expect from "expect"
import { IPFS } from "ipfs-core"

import { createInMemoryIPFS } from "../helpers/in-memory-ipfs.js"

import * as ipfsConfig from "../../src/ipfs/index.js"
import FileSystem from "../../src/fs/filesystem.js"
import * as path from "../../src/path.js"
import { PublicTree } from "../../src/fs/v1/PublicTree.js"


type Files = { path: path.FilePath; content: string }[]

const setupFiles: Files =
  [ { path: path.file("public", "index.html"), content: "<h1>Hello</h1>" }
  , { path: path.file("public", "doc.md"), content: "# Hello" }
  , { path: path.file("public", "test", "doc.md"), content: "---" }
  , { path: path.file("public", "test", "index.html"), content: "<p>Hi</p>" }
  , { path: path.file("public", "test.txt"), content: "x" }
  ]

const remoteFiles: Files =
  [ { path: path.file("public", "index.html"), content: "written by remote" }
  , { path: path.file("public", "index.html"), content: "<h1>written by remote again</h1>" }
  , { path: path.file("public", "test", "index.html"), content: "<p>written by remote</p>" }
  ]

const localFiles: Files =
  [ { path: path.file("public", "index.html"), content: "something else" }
  , { path: path.file("public", "test", "doc.md"), content: "# Hello World" }
  ]

async function writeFiles(fs: FileSystem, files: Files) {
  for (const file of files) {
    await fs.write(file.path, file.content)
  }
}

describe("conflict detection", () => {

  let ipfs: IPFS | null = null

  before(async () => {
    ipfs = await createInMemoryIPFS()
    ipfsConfig.set(ipfs)
  })

  after(async () => {
    if (ipfs == null) return
    await ipfs.stop()
  })


  it("detects a conflict", async () => {
    const commonFs = await FileSystem.empty({ localOnly: true })
    await writeFiles(commonFs, setupFiles)
    const commonCID = await commonFs.root.put()
    const commonPublicCID = commonFs.root.publicTree.cid

    const remoteFs = await FileSystem.fromCID(commonCID, { localOnly: true })
    await writeFiles(remoteFs, remoteFiles)
    const localFs = await FileSystem.fromCID(commonCID, { localOnly: true })
    await writeFiles(localFs, localFiles)

    // Diverging case: Changes both locally & remotely
    const divPoint = await divergencePoint(localFs.root.publicTree, remoteFs.root.publicTree)
    expect(divPoint?.common?.cid).toEqual(commonPublicCID)

    // Push case: Changes locally on top of what's in remote at the moment
    const pushPoint = await divergencePoint(localFs.root.publicTree, commonFs.root.publicTree)
    expect(pushPoint?.common?.cid).toEqual(commonPublicCID)
    expect(pushPoint?.futureRemote?.length).toEqual(0)
    expect(pushPoint?.futureLocal?.length).not.toEqual(0)

    // Fast forward case: No changes locally, only remotely. Could fast forward.
    const fastForwardPoint = await divergencePoint(commonFs.root.publicTree, remoteFs.root.publicTree)
    expect(fastForwardPoint?.common?.cid).toEqual(commonPublicCID)
    expect(fastForwardPoint?.futureRemote?.length).not.toEqual(0)
    expect(fastForwardPoint?.futureLocal?.length).toEqual(0)
  })

  it("performs reasonably fast", async () => {
    const commonFs = await FileSystem.empty({ localOnly: true })
    await writeFiles(commonFs, setupFiles)
    const commonCID = await commonFs.root.put()
    const commonPublicCID = commonFs.root.publicTree.cid

    const remoteFs = await FileSystem.fromCID(commonCID, { localOnly: true })
    await writeFiles(remoteFs, repeat(remoteFiles, 20))
    const localFs = await FileSystem.fromCID(commonCID, { localOnly: true })
    await writeFiles(localFs, repeat(localFiles, 20))

    // Diverging case: Changes both locally & remotely
    const divPoint = await divergencePoint(localFs.root.publicTree, remoteFs.root.publicTree)
    expect(divPoint?.common?.cid).toEqual(commonPublicCID)
  })

  it("detects completely unrelated filesystems", async () => {
    const remoteFs = await FileSystem.empty({ localOnly: true })
    await writeFiles(remoteFs, remoteFiles)

    const localFs = await FileSystem.empty({ localOnly: true })
    await writeFiles(localFs, localFiles)

    const divPoint = await divergencePoint(localFs.root.publicTree, remoteFs.root.publicTree)
    expect(divPoint).toBe(null)
  })
})

interface DivergencePoint {
  futureLocal: PublicTree[]
  futureRemote: PublicTree[]
  common: PublicTree
}

async function divergencePoint(local: PublicTree, remote: PublicTree): Promise<DivergencePoint | null> {
  const historyLocal = [local]
  const historyRemote = [remote]

  // eslint-disable-next-line no-constant-condition
  while (true) {

    const currentLocal = historyLocal[historyLocal.length - 1]
    const currentRemote = historyRemote[historyRemote.length - 1]

    // See whether the current heads are CIDs that were already contained
    // the other history respectively

    const currentLocalCID = currentLocal.cid
    const remoteCIDIndex = historyRemote.findIndex(remote => remote.cid === currentLocalCID)
    if (remoteCIDIndex != -1) {
      return {
        futureLocal: historyLocal.slice(0, historyLocal.length - 1),
        futureRemote: historyRemote.slice(0, remoteCIDIndex),
        common: currentLocal
      }
    }

    const currentRemoteCID = currentRemote.cid
    const localCIDIndex = historyLocal.findIndex(local => local.cid === currentRemoteCID)
    if (localCIDIndex != -1) {
      return {
        futureLocal: historyLocal.slice(0, localCIDIndex),
        futureRemote: historyRemote.slice(0, historyRemote.length - 1),
        common: currentRemote
      }
    }

    // There's nothing more for us to iterate
    if (currentLocal.header.previous == null && currentRemote.header.previous == null) {
      // we have completely divergent trees
      return null
    }

    // Add the 'previous' history entries to historyLocal and historyRemote

    if (currentLocal.header.previous != null) {
      const nextLocal = await PublicTree.fromCID(currentLocal.header.previous)
      historyLocal.push(nextLocal)
    }

    if (currentRemote.header.previous != null) {
      const nextRemote = await PublicTree.fromCID(currentRemote.header.previous)
      historyRemote.push(nextRemote)
    }
  }
}

function repeat<T>(array: T[], n: number): T[] {
  const arr = []
  while (n > 0) {
    for (const elem of array) arr.push(elem)
    n--
  }
  return arr
}
