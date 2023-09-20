import { strict as assert } from "assert"
import { assertUnixFsDirectory, assertUnixFsFile, assertUnixNodeRemoval } from "../../tests/helpers/filesystem.js"

import * as Path from "../path/index.js"
import * as Cabinet from "../repositories/cabinet.js"
import * as CIDLog from "../repositories/cid-log.js"
import * as Unix from "./unix.js"

import {
  account,
  agent,
  authority,
  clerk,
  depot,
  identifier,
  manners,
  storage,
} from "../../tests/helpers/components.js"
import { CID } from "../common/cid.js"
import { Inventory } from "../inventory.js"
import { Ticket } from "../ticket/types.js"
import { FileSystem } from "./class.js"

describe("File System Class", async () => {
  let fs: FileSystem
  let mounts: {
    path: Path.Distinctive<Path.Segments>
    capsuleKey: Uint8Array
  }[]

  const fsOpts = {
    dependencies: { account, agent, depot, identifier, manners },
    settleTimeBeforePublish: 250,
  }

  const fsTicket = await clerk.tickets.fileSystem.origin(
    Path.root(),
    identifier.did()
  )

  const did = fsTicket.issuer

  // HOOKS
  // -----

  beforeEach(async () => {
    const cidLog = await CIDLog.create({ did, storage })

    const cabinet = await Cabinet.create({ storage })
    const inventory = new Inventory(clerk, cabinet)

    const updateDataRoot = async (
      dataRoot: CID,
      proofs: Ticket[]
    ): Promise<{ updated: true } | { updated: false; reason: string }> => {
      return { updated: true }
    }

    fs = await FileSystem.empty({ ...fsOpts, cidLog, did, inventory, updateDataRoot })

    mounts = await fs.mountPrivateNodes([
      { path: Path.root() },
    ])

    await cabinet.addTicket(
      "file_system",
      fsTicket,
      clerk.tickets.cid
    )
  })

  // LOADING
  // -------

  it("loads a file system and capsule keys + content cids", async () => {
    const publicPath = Path.file("public", "nested-public", "public.txt")
    const privatePath = Path.file("private", "nested-private", "private.txt")

    const { contentCID } = await fs.write(publicPath, "utf8", "public")
    const { capsuleKey, dataRoot } = await fs.write(privatePath, "utf8", "private")

    const contentBytes = await Unix.exportFile(contentCID, depot)

    assert.equal(
      new TextDecoder().decode(contentBytes),
      "public"
    )

    const cidLog = await CIDLog.create({ did, storage })
    const cabinet = await Cabinet.create({ storage })
    const inventory = new Inventory(clerk, cabinet)

    const loadedFs = await FileSystem.fromCID(dataRoot, { ...fsOpts, cidLog, did, inventory })
    await loadedFs.mountPrivateNodes([
      // TODO: Needs to be fixed in rs-wnfs
      // { path: Path.removePartition(privatePath), capsuleKey },
      { path: Path.root(), capsuleKey: mounts[0].capsuleKey },
    ])

    assert.equal(await loadedFs.read(publicPath, "utf8"), "public")
    assert.equal(await loadedFs.read(privatePath, "utf8"), "private")
  })

  it("loads a file system and capsule keys + content cids after multiple changes", async () => {
    const publicPath = Path.file("public", "nested-public", "public.txt")
    const privatePath = Path.file("private", "nested-private", "private.txt")

    await fs.write(publicPath, "utf8", "public")
    await fs.write(privatePath, "utf8", "private")

    await fs.write(Path.file("public", "part.two"), "utf8", "public-2")
    const { dataRoot } = await fs.write(Path.file("private", "part.two"), "utf8", "private-2")
    const capsuleKey = await fs.capsuleKey(Path.directory("private"))

    const cidLog = await CIDLog.create({ did, storage })
    const cabinet = await Cabinet.create({ storage })
    const inventory = new Inventory(clerk, cabinet)

    const loadedFs = await FileSystem.fromCID(dataRoot, { ...fsOpts, cidLog, did, inventory })

    if (capsuleKey) {
      await loadedFs.mountPrivateNodes([
        { path: Path.root(), capsuleKey },
      ])
    } else {
      throw new Error("Expected a capsule key")
    }

    assert.equal(await loadedFs.read(publicPath, "utf8"), "public")
    assert.equal(await loadedFs.read(privatePath, "utf8"), "private")
  })

  it("loads a private file system given an older capsule key", async () => {
    const privatePath = Path.file("private", "nested-private", "private.txt")
    const oldCapsuleKey = await fs.capsuleKey(Path.directory("private"))

    const cidLog = await CIDLog.create({ did, storage })
    const cabinet = await Cabinet.create({ storage })
    const inventory = new Inventory(clerk, cabinet)

    const { dataRoot } = await fs.write(privatePath, "utf8", "private")
    const loadedFs = await FileSystem.fromCID(dataRoot, { ...fsOpts, cidLog, did, inventory })

    if (oldCapsuleKey) {
      await loadedFs.mountPrivateNodes([
        { path: Path.root(), capsuleKey: oldCapsuleKey },
      ])
    } else {
      throw new Error("Expected a capsule key")
    }

    assert.equal(await loadedFs.read(privatePath, "utf8"), "private")

    await loadedFs.write(privatePath, "utf8", "new content")

    assert.equal(await loadedFs.read(privatePath, "utf8"), "new content")
  })

  // READING & WRITING
  // -----------------

  it("writes and reads public files", async () => {
    const path = Path.file("public", "a")
    const bytes = new TextEncoder().encode("🚀")

    const { contentCID } = await fs.write(path, "bytes", bytes)

    assert.equal(await fs.read(path, "utf8"), "🚀")
    await assertUnixFsFile(fsOpts, fs, path, bytes)
  })

  it("writes and reads private files", async () => {
    const path = Path.file("private", "a")

    const { capsuleKey } = await fs.write(
      path,
      "json",
      { foo: "bar", a: 1 }
    )

    assert.deepEqual(
      await fs.read(path, "json"),
      { foo: "bar", a: 1 }
    )
  })

  it("writes and reads deeply nested files", async () => {
    const pathPublic = Path.file("public", "a", "b", "c.txt")
    const pathPrivate = Path.file("private", "a", "b", "c.txt")

    await fs.write(pathPublic, "utf8", "🌍")
    await fs.write(pathPrivate, "utf8", "🔐")

    assert.equal(await fs.exists(pathPublic), true)
    assert.equal(await fs.exists(pathPrivate), true)

    await assertUnixFsFile(fsOpts, fs, pathPublic, new TextEncoder().encode("🌍"))
  })

  it("creates files", async () => {
    await fs.write(Path.file("private", "File"), "utf8", "🧞")
    await fs.createFile(Path.file("private", "File"), "utf8", "🧞")

    assert.equal(
      await fs.exists(Path.file("private", "File (1)")),
      true
    )

    await fs.createFile(Path.file("private", "File"), "utf8", "🧞")

    assert.equal(
      await fs.exists(Path.file("private", "File (2)")),
      true
    )

    await fs.createFile(Path.file("private", "File (1)"), "utf8", "🧞")

    assert.equal(
      await fs.read(Path.file("private", "File (3)"), "utf8"),
      "🧞"
    )
  })

  it("creates files with extensions", async () => {
    await fs.write(Path.file("private", "File.7z"), "utf8", "🧞")
    await fs.createFile(Path.file("private", "File.7z"), "utf8", "🧞")

    assert.equal(
      await fs.exists(Path.file("private", "File (1).7z")),
      true
    )

    await fs.createFile(Path.file("private", "File.7z"), "utf8", "🧞")

    assert.equal(
      await fs.exists(Path.file("private", "File (2).7z")),
      true
    )

    await fs.createFile(Path.file("private", "File (1).7z"), "utf8", "🧞")

    assert.equal(
      await fs.read(Path.file("private", "File (3).7z"), "utf8"),
      "🧞"
    )
  })

  it("retrieves public content using a CID", async () => {
    const { contentCID, capsuleCID } = await fs.write(Path.file("public", "file"), "utf8", "🌍")

    assert.equal(
      await fs.read({ contentCID }, "utf8"),
      "🌍"
    )

    assert.equal(
      await fs.read({ capsuleCID }, "utf8"),
      "🌍"
    )
  })

  it("retrieves private content using a capsule key", async () => {
    const { capsuleKey } = await fs.write(Path.file("private", "file"), "utf8", "🔐")

    assert.equal(
      await fs.read({ capsuleKey }, "utf8"),
      "🔐"
    )
  })

  // DIRECTORIES
  // -----------

  it("ensures directories and checks for existence", async () => {
    await fs.ensureDirectory(Path.directory("public", "a"))
    await fs.ensureDirectory(Path.directory("public", "a", "b"))
    await fs.ensureDirectory(Path.directory("public", "a", "b", "c"))

    await fs.ensureDirectory(Path.directory("private", "a"))
    await fs.ensureDirectory(Path.directory("private", "a", "b"))
    await fs.ensureDirectory(Path.directory("private", "a", "b", "c"))

    assert.equal(await fs.exists(Path.directory("public", "a")), true)
    assert.equal(await fs.exists(Path.directory("public", "a", "b")), true)
    assert.equal(await fs.exists(Path.directory("public", "a", "b", "c")), true)

    assert.equal(await fs.exists(Path.directory("private", "a")), true)
    assert.equal(await fs.exists(Path.directory("private", "a", "b")), true)
    assert.equal(await fs.exists(Path.directory("private", "a", "b", "c")), true)

    // Does not throw for existing dirs
    await fs.ensureDirectory(Path.directory("public", "a"))
    await fs.ensureDirectory(Path.directory("public", "a", "b"))

    await fs.ensureDirectory(Path.directory("private", "a"))
    await fs.ensureDirectory(Path.directory("private", "a", "b"))

    await assertUnixFsDirectory(fsOpts, fs, Path.directory("public", "a"))
    await assertUnixFsDirectory(fsOpts, fs, Path.directory("public", "a", "b"))
  })

  it("lists public directories", async () => {
    await fs.ensureDirectory(Path.directory("public", "a"))
    await fs.write(Path.file("public", "a-file"), "utf8", "🧞")
    await fs.ensureDirectory(Path.directory("public", "a", "b"))
    await fs.write(Path.file("public", "a", "b-file"), "utf8", "💃")

    const a = await fs.listDirectory(Path.directory("public"))
    assert.deepEqual(a.map(i => i.name), ["a", "a-file"])

    const b = await fs.listDirectory(Path.directory("public", "a"))
    assert.deepEqual(b.map(i => i.name), ["b", "b-file"])
  })

  it("lists public directories with item kind", async () => {
    const pathDirA = Path.directory("public", "a")
    const pathFileA = Path.file("public", "a-file")
    const pathDirB = Path.directory("public", "a", "b")
    const pathFileB = Path.file("public", "a", "b-file")

    await fs.ensureDirectory(pathDirA)
    await fs.write(pathFileA, "utf8", "🧞")
    await fs.ensureDirectory(pathDirB)
    await fs.write(pathFileB, "utf8", "💃")

    const a = await fs.listDirectory(Path.directory("public"), { withItemKind: true })
    assert.deepEqual(a.map(i => i.kind), [Path.Kind.Directory, Path.Kind.File])
    assert.deepEqual(a.map(i => i.path), [pathDirA, pathFileA])

    const b = await fs.listDirectory(Path.directory("public", "a"), { withItemKind: true })
    assert.deepEqual(b.map(i => i.kind), [Path.Kind.Directory, Path.Kind.File])
    assert.deepEqual(b.map(i => i.path), [pathDirB, pathFileB])
  })

  it("lists private directories", async () => {
    await fs.ensureDirectory(Path.directory("private", "a"))
    await fs.write(Path.file("private", "a-file"), "utf8", "🧞")
    await fs.ensureDirectory(Path.directory("private", "a", "b"))
    await fs.write(Path.file("private", "a", "b-file"), "utf8", "💃")

    const a = await fs.listDirectory(Path.directory("private"))
    assert.deepEqual(a.map(i => i.name), ["a", "a-file"])

    const b = await fs.listDirectory(Path.directory("private", "a"))
    assert.deepEqual(b.map(i => i.name), ["b", "b-file"])
  })

  it("lists private directories with item kind", async () => {
    const pathDirA = Path.directory("private", "a")
    const pathFileA = Path.file("private", "a-file")
    const pathDirB = Path.directory("private", "a", "b")
    const pathFileB = Path.file("private", "a", "b-file")

    await fs.ensureDirectory(pathDirA)
    await fs.write(pathFileA, "utf8", "🧞")
    await fs.ensureDirectory(pathDirB)
    await fs.write(pathFileB, "utf8", "💃")

    const a = await fs.listDirectory(Path.directory("private"), { withItemKind: true })
    assert.deepEqual(a.map(i => i.kind), [Path.Kind.Directory, Path.Kind.File])
    assert.deepEqual(a.map(i => i.path), [pathDirA, pathFileA])

    const b = await fs.listDirectory(Path.directory("private", "a"), { withItemKind: true })
    assert.deepEqual(b.map(i => i.kind), [Path.Kind.Directory, Path.Kind.File])
    assert.deepEqual(b.map(i => i.path), [pathDirB, pathFileB])
  })

  it("creates directories", async () => {
    await fs.ensureDirectory(Path.directory("private", "Directory"))
    await fs.createDirectory(Path.directory("private", "Directory"))

    assert.equal(
      await fs.exists(Path.directory("private", "Directory (1)")),
      true
    )

    await fs.createDirectory(Path.directory("private", "Directory"))

    assert.equal(
      await fs.exists(Path.directory("private", "Directory (2)")),
      true
    )

    await fs.createDirectory(Path.directory("private", "Directory (1)"))

    assert.equal(
      await fs.exists(Path.directory("private", "Directory (3)")),
      true
    )
  })

  it("creates directories with extensions", async () => {
    await fs.ensureDirectory(Path.directory("private", "Directory.7z"))
    await fs.createDirectory(Path.directory("private", "Directory.7z"))

    assert.equal(
      await fs.exists(Path.directory("private", "Directory.7z (1)")),
      true
    )

    await fs.createDirectory(Path.directory("private", "Directory.7z"))

    assert.equal(
      await fs.exists(Path.directory("private", "Directory.7z (2)")),
      true
    )

    await fs.createDirectory(Path.directory("private", "Directory.7z (1)"))

    assert.equal(
      await fs.exists(Path.directory("private", "Directory.7z (3)")),
      true
    )
  })

  // CIDS & REFS
  // -----------

  it("can get a content CID for an existing public file", async () => {
    const path = Path.file("public", "a", "b", "file")

    const { contentCID } = await fs.write(path, "utf8", "💃")
    const cid = await fs.contentCID(path)

    assert.equal(
      cid?.toString(),
      contentCID.toString()
    )
  })

  it("can get a capsule CID for an existing public file", async () => {
    const path = Path.file("public", "a", "b", "file")

    const { capsuleCID } = await fs.write(path, "utf8", "💃")
    const cid = await fs.capsuleCID(path)

    assert.equal(
      cid?.toString(),
      capsuleCID.toString()
    )
  })

  it("can get a capsule CID for an existing public directory", async () => {
    const path = Path.directory("public", "a", "b", "directory")

    const { capsuleCID } = await fs.ensureDirectory(path)
    const cid = await fs.capsuleCID(path)

    assert.equal(
      cid?.toString(),
      capsuleCID.toString()
    )
  })

  it("can get a capsule key for an existing private file", async () => {
    const path = Path.file("private", "a", "b", "file")

    const { capsuleKey } = await fs.write(path, "utf8", "💃")
    const key = await fs.capsuleKey(path)

    assert.equal(
      key ? JSON.stringify(key) : null,
      JSON.stringify(capsuleKey)
    )
  })

  it("can get a capsule CID for an existing private directory", async () => {
    const path = Path.directory("private", "a", "b", "directory")

    const { capsuleKey } = await fs.ensureDirectory(path)
    const key = await fs.capsuleKey(path)

    assert.equal(
      key ? JSON.stringify(key) : null,
      JSON.stringify(capsuleKey)
    )
  })

  it("can get a capsule CID for a mounted private directory", async () => {
    const path = Path.directory("private")
    const key = await fs.capsuleKey(path)

    assert.notEqual(
      key ? JSON.stringify(key) : null,
      null
    )
  })

  // REMOVE
  // ------

  it("removes public files", async () => {
    const path = Path.file("public", "a", "b", "file")

    await fs.write(path, "utf8", "💃")
    await fs.remove(path)

    assert.equal(
      await fs.exists(path),
      false
    )

    await assertUnixNodeRemoval(fsOpts, fs, path)
  })

  it("removes private files", async () => {
    const path = Path.file("private", "a", "b", "file")

    await fs.write(path, "utf8", "💃")
    await fs.remove(path)

    assert.equal(
      await fs.exists(path),
      false
    )
  })

  it("removes public directories", async () => {
    const path = Path.directory("public", "a", "b", "directory")

    await fs.ensureDirectory(path)
    await fs.remove(path)

    assert.equal(
      await fs.exists(path),
      false
    )

    await assertUnixNodeRemoval(fsOpts, fs, path)
  })

  it("removes private directories", async () => {
    const path = Path.directory("private", "a", "b", "directory")

    await fs.ensureDirectory(path)
    await fs.remove(path)

    assert.equal(
      await fs.exists(path),
      false
    )
  })

  // COPYING
  // -------

  it("copies public files", async () => {
    const fromPath = Path.file("public", "a", "b", "file")
    const toPath = Path.file("public", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.copy(fromPath, toPath)

    assert.equal(await fs.read(toPath, "utf8"), "💃")
  })

  it("copies public files into a directory that already exists", async () => {
    await fs.ensureDirectory(Path.directory("public", "a", "b", "c", "d"))

    const fromPath = Path.file("public", "a", "b", "file")
    const toPath = Path.file("public", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.copy(fromPath, toPath)

    assert.equal(await fs.read(toPath, "utf8"), "💃")
  })

  it("copies private files", async () => {
    const fromPath = Path.file("private", "a", "b", "file")
    const toPath = Path.file("private", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.copy(fromPath, toPath)

    assert.equal(await fs.read(toPath, "utf8"), "💃")
  })

  it("copies private files into a directory that already exists", async () => {
    await fs.ensureDirectory(Path.directory("private", "a", "b", "c", "d"))

    const fromPath = Path.file("private", "a", "b", "file")
    const toPath = Path.file("private", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.copy(fromPath, toPath)

    assert.equal(await fs.read(toPath, "utf8"), "💃")
  })

  it("copies public directories", async () => {
    const fromPath = Path.directory("public", "b", "c")
    const toPath = Path.directory("public", "a", "b", "c", "d", "e")

    await fs.write(Path.combine(fromPath, Path.file("file")), "utf8", "💃")
    await fs.write(Path.combine(fromPath, Path.file("nested", "file")), "utf8", "🧞")
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-empty")))
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-2", "deeply-nested")))

    await fs.copy(fromPath, toPath)

    assert.equal(
      await fs.read(Path.combine(toPath, Path.file("file")), "utf8"),
      "💃"
    )

    assert.equal(
      await fs.read(Path.combine(toPath, Path.file("nested", "file")), "utf8"),
      "🧞"
    )

    assert.equal(
      await fs.exists(Path.combine(toPath, Path.directory("nested-empty"))),
      true
    )

    assert.equal(
      await fs.exists(Path.combine(toPath, Path.directory("nested-2", "deeply-nested"))),
      true
    )

    await fs.copy(
      Path.directory("public", "a", "b"),
      Path.directory("public")
    )

    assert.equal(
      await fs.exists(Path.directory("public", "b", "c", "nested-2", "deeply-nested")),
      true
    )
  })

  it("copies private directories", async () => {
    const fromPath = Path.directory("private", "b", "c")
    const toPath = Path.directory("private", "a", "b", "c", "d", "e")

    await fs.write(Path.combine(fromPath, Path.file("file")), "utf8", "💃")
    await fs.write(Path.combine(fromPath, Path.file("nested", "file")), "utf8", "🧞")
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-empty")))
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-2", "deeply-nested")))

    await fs.copy(fromPath, toPath)

    assert.equal(
      await fs.read(Path.combine(toPath, Path.file("file")), "utf8"),
      "💃"
    )

    assert.equal(
      await fs.read(Path.combine(toPath, Path.file("nested", "file")), "utf8"),
      "🧞"
    )

    assert.equal(
      await fs.exists(Path.combine(toPath, Path.directory("nested-empty"))),
      true
    )

    assert.equal(
      await fs.exists(Path.combine(toPath, Path.directory("nested-2", "deeply-nested"))),
      true
    )

    await fs.copy(
      Path.directory("private", "a"),
      Path.directory("private")
    )

    assert.equal(
      await fs.exists(Path.directory("private", "b", "c", "nested-2", "deeply-nested")),
      true
    )
  })

  // MOVING
  // ------

  it("moves public files", async () => {
    const fromPath = Path.file("public", "a", "b", "file")
    const toPath = Path.file("public", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.move(fromPath, toPath)

    assert.equal(await fs.read(toPath, "utf8"), "💃")
    assert.equal(await fs.exists(fromPath), false)
  })

  it("moves private files", async () => {
    const fromPath = Path.file("private", "a", "b", "file")
    const toPath = Path.file("private", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.move(fromPath, toPath)

    assert.equal(await fs.read(toPath, "utf8"), "💃")
    assert.equal(await fs.exists(fromPath), false)
  })

  it("moves public directories", async () => {
    const fromPath = Path.directory("public", "b", "c")
    const toPath = Path.directory("public", "a", "b", "c", "d", "e")

    await fs.write(Path.combine(fromPath, Path.file("file")), "utf8", "💃")
    await fs.write(Path.combine(fromPath, Path.file("nested", "file")), "utf8", "🧞")
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-empty")))
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-2", "deeply-nested")))

    await fs.move(fromPath, toPath)

    assert.equal(
      await fs.read(Path.combine(toPath, Path.file("file")), "utf8"),
      "💃"
    )

    assert.equal(
      await fs.read(Path.combine(toPath, Path.file("nested", "file")), "utf8"),
      "🧞"
    )

    assert.equal(
      await fs.exists(Path.combine(toPath, Path.directory("nested-empty"))),
      true
    )

    assert.equal(
      await fs.exists(Path.combine(toPath, Path.directory("nested-2", "deeply-nested"))),
      true
    )

    assert.equal(
      await fs.exists(fromPath),
      false
    )

    await fs.move(
      Path.directory("public", "a"),
      Path.directory("public")
    )

    assert.equal(
      await fs.exists(Path.directory("public", "b", "c", "nested-2", "deeply-nested")),
      false
    )

    assert.equal(
      await fs.exists(Path.directory("public", "a")),
      false
    )

    assert.equal(
      await fs.exists(Path.directory("public", "a", "b", "c", "d", "e", "nested-2", "deeply-nested")),
      false
    )
  })

  it("moves private directories", async () => {
    const fromPath = Path.directory("private", "b", "c")
    const toPath = Path.directory("private", "a", "b", "c", "d", "e")

    await fs.write(Path.combine(fromPath, Path.file("file")), "utf8", "💃")
    await fs.write(Path.combine(fromPath, Path.file("nested", "file")), "utf8", "🧞")
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-empty")))
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-2", "deeply-nested")))

    await fs.move(fromPath, toPath)

    assert.equal(
      await fs.read(Path.combine(toPath, Path.file("file")), "utf8"),
      "💃"
    )

    assert.equal(
      await fs.read(Path.combine(toPath, Path.file("nested", "file")), "utf8"),
      "🧞"
    )

    assert.equal(
      await fs.exists(Path.combine(toPath, Path.directory("nested-empty"))),
      true
    )

    assert.equal(
      await fs.exists(Path.combine(toPath, Path.directory("nested-2", "deeply-nested"))),
      true
    )

    assert.equal(
      await fs.exists(fromPath),
      false
    )

    await fs.move(
      Path.directory("private", "a"),
      Path.directory("private")
    )

    assert.equal(
      await fs.exists(Path.directory("public", "b", "c", "nested-2", "deeply-nested")),
      false
    )

    assert.equal(
      await fs.exists(Path.directory("public", "a")),
      false
    )

    assert.equal(
      await fs.exists(Path.directory("public", "a", "b", "c", "d", "e", "nested-2", "deeply-nested")),
      false
    )
  })

  it("moves a public file to the private partition", async () => {
    const fromPath = Path.file("public", "a", "b", "file")
    const toPath = Path.file("private", "a", "b", "c", "d", "file")

    const { capsuleCID } = await fs.write(fromPath, "utf8", "💃")
    const { capsuleKey } = await fs.move(fromPath, toPath)

    assert.equal(await fs.read(toPath, "utf8"), "💃")
    assert.equal(await fs.exists(fromPath), false)
  })

  it("moves a private file to the public partition", async () => {
    const fromPath = Path.file("private", "a", "b", "file")
    const toPath = Path.file("public", "a", "b", "c", "d", "file")

    const { capsuleKey } = await fs.write(fromPath, "utf8", "💃")
    const { capsuleCID } = await fs.move(fromPath, toPath)

    assert.equal(await fs.read(toPath, "utf8"), "💃")
    assert.equal(await fs.exists(fromPath), false)
  })

  // RENAMING
  // --------

  it("renames public files", async () => {
    await fs.write(Path.file("public", "a"), "bytes", new Uint8Array())
    await fs.rename(Path.file("public", "a"), "b")

    assert.equal(
      await fs.exists(Path.file("public", "a")),
      false
    )

    assert.equal(
      await fs.exists(Path.file("public", "b")),
      true
    )
  })

  it("renames private files", async () => {
    await fs.write(Path.file("private", "a"), "bytes", new Uint8Array())
    await fs.rename(Path.file("private", "a"), "b")

    assert.equal(
      await fs.exists(Path.file("private", "a")),
      false
    )

    assert.equal(
      await fs.exists(Path.file("private", "b")),
      true
    )
  })

  it("renames public directories", async () => {
    await fs.ensureDirectory(Path.directory("public", "a"))
    await fs.rename(Path.directory("public", "a"), "b")

    assert.equal(
      await fs.exists(Path.directory("public", "a")),
      false
    )

    assert.equal(
      await fs.exists(Path.directory("public", "b")),
      true
    )
  })

  it("renames private directories", async () => {
    await fs.ensureDirectory(Path.directory("private", "a"))
    await fs.rename(Path.directory("private", "a"), "b")

    assert.equal(
      await fs.exists(Path.directory("private", "a")),
      false
    )

    assert.equal(
      await fs.exists(Path.directory("private", "b")),
      true
    )
  })

  // PUBLISHING
  // ----------

  it("publishes & debounces by default", async () => {
    await new Promise(resolve => setTimeout(resolve, fsOpts.settleTimeBeforePublish * 1.5))

    const promise: Promise<CID> = new Promise((resolve, reject) => {
      setTimeout(reject, 10000)
      fs.once("publish").then(event => event.dataRoot).then(resolve, reject)
    })

    const a = await fs.write(Path.file("private", "a"), "bytes", new Uint8Array())
    const b = await fs.write(Path.file("private", "b"), "bytes", new Uint8Array())
    const c = await fs.write(Path.file("private", "c"), "bytes", new Uint8Array())
    const d = await fs.write(Path.file("private", "d"), "bytes", new Uint8Array())

    assert.equal(
      (await promise).toString(),
      d.dataRoot.toString()
    )

    assert.equal((await a.publishingStatus).persisted, true)
    assert.equal((await b.publishingStatus).persisted, true)
    assert.equal((await c.publishingStatus).persisted, true)
    assert.equal((await d.publishingStatus).persisted, true)
  })

  it("doesn't publish when asked not to do so", async () => {
    let published = false

    fs.on("publish", () => {
      published = true
    })

    await fs.mkdir(Path.directory("private", "dir"), { skipPublish: true })
    await fs.write(Path.file("public", "file"), "bytes", new Uint8Array(), { skipPublish: true })
    await fs.cp(Path.file("public", "file"), Path.file("private", "file"), { skipPublish: true })
    await fs.mv(Path.file("private", "file"), Path.file("private", "dir", "file"), { skipPublish: true })
    await fs.rename(Path.file("private", "dir", "file"), "renamed", { skipPublish: true })
    await fs.rm(Path.file("private", "dir", "renamed"), { skipPublish: true })

    await new Promise(resolve => setTimeout(resolve, fsOpts.settleTimeBeforePublish * 1.5))

    assert.equal(published, false)
  })

  // EVENTS
  // ------
  // Other than "publish"

  it("emits an event for a mutation", async () => {
    const eventPromise: Promise<CID> = new Promise((resolve, reject) => {
      setTimeout(reject, 10000)

      fs.on("local-change", ({ dataRoot }) => {
        resolve(dataRoot)
      })
    })

    const mutationResult = await fs.write(Path.file("private", "file"), "bytes", new Uint8Array())

    assert.equal(
      (await eventPromise).toString(),
      mutationResult.dataRoot.toString()
    )
  })

  // TRANSACTIONS
  // ------------

  it("commits a transaction", async () => {
    await fs.transaction(async t => {
      await t.write(Path.file("private", "file"), "utf8", "💃")
      await t.write(Path.file("public", "file"), "bytes", await t.read(Path.file("private", "file"), "bytes"))
    })

    assert.equal(
      await fs.read(Path.file("public", "file"), "utf8"),
      "💃"
    )
  })

  it("doesn't commit a transaction when an error occurs inside of the transaction", async () => {
    const tracker = new assert.CallTracker()

    async function transaction() {
      await fs.transaction(async t => {
        await t.write(Path.file("private", "file"), "utf8", "💃")
        throw new Error("Whoops")
      }).catch(e => {})
    }

    const tracked = tracker.calls(transaction, 1)

    await tracked()
    tracker.verify()

    try {
      await fs.read(Path.file("private", "file"), "utf8")
    } catch (e) {
      assert(e)
    }
  })
})
