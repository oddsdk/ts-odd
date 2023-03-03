import * as Uint8arrays from "uint8arrays"
import { exporter } from "ipfs-unixfs-exporter"
import all from "it-all"
import expect from "expect"

import * as Events from "../events.js"
import * as Path from "../path/index.js"

import { CID } from "../common/cid.js"
import { FileSystem } from "./class.js"
import { crypto, depot, manners, reference } from "../../tests/helpers/components.js"
import { createEmitter } from "../events.js"


describe("File System Class", () => {

  let fs: FileSystem

  const fsOpts = {
    account: { rootDID: "ROOT_DID" },
    dependencies: { crypto, depot, manners, reference },
    eventEmitter: createEmitter<Events.FileSystem>(),
    settleTimeBeforePublish: 250,
  }


  // HOOKS
  // -----

  beforeEach(async () => {
    fs = await FileSystem.empty(fsOpts)

    await fs.mountPrivateNodes([
      { path: Path.root() }
    ])
  })


  // LOADING
  // -------

  it("loads a file system and capsule references + content cids", async () => {
    const publicPath = Path.file("public", "public.txt")
    const privatePath = Path.file("private", "private.txt")

    const { contentCID } = await fs.write(publicPath, "utf8", "public")
    const { capsuleRef, dataRoot } = await fs.write(privatePath, "utf8", "private")

    const unixFsEntry = await exporter(contentCID, depot.blockstore)
    const contentBytes = Uint8arrays.concat(await all(unixFsEntry.content()))

    expect(
      new TextDecoder().decode(contentBytes)
    ).toEqual(
      "public"
    )

    const loadedFs = await FileSystem.fromCID(dataRoot, fsOpts)
    await loadedFs.mountPrivateNodes([
      { path: Path.removePartition(privatePath), capsuleRef }
    ])

    expect(await loadedFs.read(publicPath, "utf8")).toEqual("public")
    expect(await loadedFs.read(privatePath, "utf8")).toEqual("private")
  })


  // READING & WRITING
  // -----------------

  it("writes and reads public files", async () => {
    const path = Path.file("public", "a")

    const { contentCID } = await fs.write(
      path, "bytes", new TextEncoder().encode("🚀")
    )

    expect(
      await fs.read(path, "utf8")
    ).toEqual(
      "🚀"
    )
  })

  it("writes and reads private files", async () => {
    const path = Path.file("private", "a")

    const { capsuleRef } = await fs.write(
      path, "json", { foo: "bar", a: 1 }
    )

    expect(
      await fs.read(path, "json")
    ).toEqual(
      { foo: "bar", a: 1 }
    )
  })

  it("writes and reads deeply nested files", async () => {
    const pathPublic = Path.file("public", "a", "b", "c.txt")
    const pathPrivate = Path.file("private", "a", "b", "c.txt")

    await fs.write(pathPublic, "utf8", "🌍")
    await fs.write(pathPrivate, "utf8", "🔐")

    expect(await fs.exists(pathPublic)).toBe(true)
    expect(await fs.exists(pathPrivate)).toBe(true)
  })

  it("creates files", async () => {
    await fs.write(Path.file("private", "File"), "utf8", "🧞")
    await fs.createFile(Path.file("private", "File"), "utf8", "🧞")

    expect(
      await fs.exists(Path.file("private", "File (1)"))
    ).toBe(
      true
    )

    await fs.createFile(Path.file("private", "File"), "utf8", "🧞")

    expect(
      await fs.exists(Path.file("private", "File (2)"))
    ).toBe(
      true
    )

    await fs.createFile(Path.file("private", "File (1)"), "utf8", "🧞")

    expect(
      await fs.read(Path.file("private", "File (3)"), "utf8")
    ).toEqual(
      "🧞"
    )
  })

  it("creates files with extensions", async () => {
    await fs.write(Path.file("private", "File.7z"), "utf8", "🧞")
    await fs.createFile(Path.file("private", "File.7z"), "utf8", "🧞")

    expect(
      await fs.exists(Path.file("private", "File (1).7z"))
    ).toBe(
      true
    )

    await fs.createFile(Path.file("private", "File.7z"), "utf8", "🧞")

    expect(
      await fs.exists(Path.file("private", "File (2).7z"))
    ).toBe(
      true
    )

    await fs.createFile(Path.file("private", "File (1).7z"), "utf8", "🧞")

    expect(
      await fs.read(Path.file("private", "File (3).7z"), "utf8")
    ).toEqual(
      "🧞"
    )
  })

  it("retrieves public content using a CID", async () => {
    const { contentCID, capsuleCID } = await fs.write(Path.file("public", "file"), "utf8", "🌍")

    expect(
      await fs.read({ contentCID }, "utf8")
    ).toEqual(
      "🌍"
    )

    expect(
      await fs.read({ capsuleCID }, "utf8")
    ).toEqual(
      "🌍"
    )
  })


  it("retrieves private content using a reference", async () => {
    const { capsuleRef } = await fs.write(Path.file("private", "file"), "utf8", "🔐")

    expect(
      await fs.read({ capsuleRef }, "utf8")
    ).toEqual(
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

    expect(await fs.exists(Path.directory("public", "a"))).toBe(true)
    expect(await fs.exists(Path.directory("public", "a", "b"))).toBe(true)
    expect(await fs.exists(Path.directory("public", "a", "b", "c"))).toBe(true)

    expect(await fs.exists(Path.directory("private", "a"))).toBe(true)
    expect(await fs.exists(Path.directory("private", "a", "b"))).toBe(true)
    expect(await fs.exists(Path.directory("private", "a", "b", "c"))).toBe(true)

    // Does not throw for existing dirs
    await fs.ensureDirectory(Path.directory("public", "a"))
    await fs.ensureDirectory(Path.directory("public", "a", "b"))

    await fs.ensureDirectory(Path.directory("private", "a"))
    await fs.ensureDirectory(Path.directory("private", "a", "b"))
  })

  it("lists public directories", async () => {
    await fs.ensureDirectory(Path.directory("public", "a"))
    await fs.write(Path.file("public", "a-file"), "utf8", "🧞")
    await fs.ensureDirectory(Path.directory("public", "a", "b"))
    await fs.write(Path.file("public", "a", "b-file"), "utf8", "💃")

    const a = await fs.listDirectory(Path.directory("public"))
    expect(a.map(i => i.name)).toEqual([ "a", "a-file" ])

    const b = await fs.listDirectory(Path.directory("public", "a"))
    expect(b.map(i => i.name)).toEqual([ "b", "b-file" ])
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
    expect(a.map(i => i.kind)).toEqual([ Path.Kind.Directory, Path.Kind.File ])
    expect(a.map(i => i.path)).toEqual([ pathDirA, pathFileA ])

    const b = await fs.listDirectory(Path.directory("public", "a"), { withItemKind: true })
    expect(b.map(i => i.kind)).toEqual([ Path.Kind.Directory, Path.Kind.File ])
    expect(b.map(i => i.path)).toEqual([ pathDirB, pathFileB ])
  })

  it("lists private directories", async () => {
    await fs.ensureDirectory(Path.directory("private", "a"))
    await fs.write(Path.file("private", "a-file"), "utf8", "🧞")
    await fs.ensureDirectory(Path.directory("private", "a", "b"))
    await fs.write(Path.file("private", "a", "b-file"), "utf8", "💃")

    const a = await fs.listDirectory(Path.directory("private"))
    expect(a.map(i => i.name)).toEqual([ "a", "a-file" ])

    const b = await fs.listDirectory(Path.directory("private", "a"))
    expect(b.map(i => i.name)).toEqual([ "b", "b-file" ])
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
    expect(a.map(i => i.kind)).toEqual([ Path.Kind.Directory, Path.Kind.File ])
    expect(a.map(i => i.path)).toEqual([ pathDirA, pathFileA ])

    const b = await fs.listDirectory(Path.directory("private", "a"), { withItemKind: true })
    expect(b.map(i => i.kind)).toEqual([ Path.Kind.Directory, Path.Kind.File ])
    expect(b.map(i => i.path)).toEqual([ pathDirB, pathFileB ])
  })

  it("creates directories", async () => {
    await fs.ensureDirectory(Path.directory("private", "Directory"))
    await fs.createDirectory(Path.directory("private", "Directory"))

    expect(
      await fs.exists(Path.directory("private", "Directory (1)"))
    ).toBe(
      true
    )

    await fs.createDirectory(Path.directory("private", "Directory"))

    expect(
      await fs.exists(Path.directory("private", "Directory (2)"))
    ).toBe(
      true
    )

    await fs.createDirectory(Path.directory("private", "Directory (1)"))

    expect(
      await fs.exists(Path.directory("private", "Directory (3)"))
    ).toBe(
      true
    )
  })

  it("creates directories with extensions", async () => {
    await fs.ensureDirectory(Path.directory("private", "Directory.7z"))
    await fs.createDirectory(Path.directory("private", "Directory.7z"))

    expect(
      await fs.exists(Path.directory("private", "Directory.7z (1)"))
    ).toBe(
      true
    )

    await fs.createDirectory(Path.directory("private", "Directory.7z"))

    expect(
      await fs.exists(Path.directory("private", "Directory.7z (2)"))
    ).toBe(
      true
    )

    await fs.createDirectory(Path.directory("private", "Directory.7z (1)"))

    expect(
      await fs.exists(Path.directory("private", "Directory.7z (3)"))
    ).toBe(
      true
    )
  })


  // CIDS & REFS
  // -----------

  it("can get a content CID for an existing public file", async () => {
    const path = Path.file("public", "a", "b", "file")

    const { contentCID } = await fs.write(path, "utf8", "💃")
    const cid = await fs.contentCID(path)

    expect(
      cid?.toString()
    ).toEqual(
      contentCID.toString()
    )
  })

  it("can get a capsule CID for an existing public file", async () => {
    const path = Path.file("public", "a", "b", "file")

    const { capsuleCID } = await fs.write(path, "utf8", "💃")
    const cid = await fs.capsuleCID(path)

    expect(
      cid?.toString()
    ).toEqual(
      capsuleCID.toString()
    )
  })

  it("can get a capsule CID for an existing public directory", async () => {
    const path = Path.directory("public", "a", "b", "directory")

    const { capsuleCID } = await fs.ensureDirectory(path)
    const cid = await fs.capsuleCID(path)

    expect(
      cid?.toString()
    ).toEqual(
      capsuleCID.toString()
    )
  })

  it("can get a capsule reference for an existing private file", async () => {
    const path = Path.file("private", "a", "b", "file")

    const { capsuleRef } = await fs.write(path, "utf8", "💃")
    const ref = await fs.capsuleRef(path)

    expect(
      ref ? JSON.stringify(ref) : null
    ).toEqual(
      JSON.stringify(capsuleRef)
    )
  })

  it("can get a capsule CID for an existing private directory", async () => {
    const path = Path.directory("private", "a", "b", "directory")

    const { capsuleRef } = await fs.ensureDirectory(path)
    const ref = await fs.capsuleRef(path)

    expect(
      ref ? JSON.stringify(ref) : null
    ).toEqual(
      JSON.stringify(capsuleRef)
    )
  })

  it("can get a capsule CID for a mounted private directory", async () => {
    const path = Path.directory("private")
    const ref = await fs.capsuleRef(path)

    expect(
      ref ? JSON.stringify(ref) : null
    ).not.toBe(
      null
    )
  })


  // REMOVE
  // ------

  it("removes public files", async () => {
    const path = Path.file("public", "a", "b", "file")

    await fs.write(path, "utf8", "💃")
    await fs.remove(path)

    expect(
      await fs.exists(path)
    ).toBe(
      false
    )
  })

  it("removes private files", async () => {
    const path = Path.file("private", "a", "b", "file")

    await fs.write(path, "utf8", "💃")
    await fs.remove(path)

    expect(
      await fs.exists(path)
    ).toBe(
      false
    )
  })

  it("removes public directories", async () => {
    const path = Path.directory("public", "a", "b", "directory")

    await fs.ensureDirectory(path)
    await fs.remove(path)

    expect(
      await fs.exists(path)
    ).toBe(
      false
    )
  })

  it("removes private directories", async () => {
    const path = Path.directory("private", "a", "b", "directory")

    await fs.ensureDirectory(path)
    await fs.remove(path)

    expect(
      await fs.exists(path)
    ).toBe(
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

    expect(await fs.read(toPath, "utf8")).toEqual("💃")
  })

  it("copies public files into a directory that already exists", async () => {
    await fs.ensureDirectory(Path.directory("public", "a", "b", "c", "d"))

    const fromPath = Path.file("public", "a", "b", "file")
    const toPath = Path.file("public", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.copy(fromPath, toPath)

    expect(await fs.read(toPath, "utf8")).toEqual("💃")
  })

  it("copies private files", async () => {
    const fromPath = Path.file("private", "a", "b", "file")
    const toPath = Path.file("private", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.copy(fromPath, toPath)

    expect(await fs.read(toPath, "utf8")).toEqual("💃")
  })

  it("copies private files into a directory that already exists", async () => {
    await fs.ensureDirectory(Path.directory("private", "a", "b", "c", "d"))

    const fromPath = Path.file("private", "a", "b", "file")
    const toPath = Path.file("private", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.copy(fromPath, toPath)

    expect(await fs.read(toPath, "utf8")).toEqual("💃")
  })

  it("copies public directories", async () => {
    const fromPath = Path.directory("public", "b", "c")
    const toPath = Path.directory("public", "a", "b", "c", "d", "e")

    await fs.write(Path.combine(fromPath, Path.file("file")), "utf8", "💃")
    await fs.write(Path.combine(fromPath, Path.file("nested", "file")), "utf8", "🧞")
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-empty")))
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-2", "deeply-nested")))

    await fs.copy(fromPath, toPath)

    expect(
      await fs.read(Path.combine(toPath, Path.file("file")), "utf8")
    ).toEqual(
      "💃"
    )

    expect(
      await fs.read(Path.combine(toPath, Path.file("nested", "file")), "utf8")
    ).toEqual(
      "🧞"
    )

    expect(
      await fs.exists(Path.combine(toPath, Path.directory("nested-empty")))
    ).toBe(
      true
    )

    expect(
      await fs.exists(Path.combine(toPath, Path.directory("nested-2", "deeply-nested")))
    ).toBe(
      true
    )

    await fs.copy(
      Path.directory("public", "a", "b"),
      Path.directory("public")
    )

    expect(
      await fs.exists(Path.directory("public", "b", "c", "nested-2", "deeply-nested"))
    ).toBe(
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

    expect(
      await fs.read(Path.combine(toPath, Path.file("file")), "utf8")
    ).toEqual(
      "💃"
    )

    expect(
      await fs.read(Path.combine(toPath, Path.file("nested", "file")), "utf8")
    ).toEqual(
      "🧞"
    )

    expect(
      await fs.exists(Path.combine(toPath, Path.directory("nested-empty")))
    ).toBe(
      true
    )

    expect(
      await fs.exists(Path.combine(toPath, Path.directory("nested-2", "deeply-nested")))
    ).toBe(
      true
    )

    await fs.copy(
      Path.directory("private", "a"),
      Path.directory("private")
    )

    expect(
      await fs.exists(Path.directory("private", "b", "c", "nested-2", "deeply-nested"))
    ).toBe(
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

    expect(await fs.read(toPath, "utf8")).toEqual("💃")
    expect(await fs.exists(fromPath)).toBe(false)
  })

  it("moves private files", async () => {
    const fromPath = Path.file("private", "a", "b", "file")
    const toPath = Path.file("private", "a", "b", "c", "d", "file")

    await fs.write(fromPath, "utf8", "💃")
    await fs.move(fromPath, toPath)

    expect(await fs.read(toPath, "utf8")).toEqual("💃")
    expect(await fs.exists(fromPath)).toBe(false)
  })

  it("moves public directories", async () => {
    const fromPath = Path.directory("public", "b", "c")
    const toPath = Path.directory("public", "a", "b", "c", "d", "e")

    await fs.write(Path.combine(fromPath, Path.file("file")), "utf8", "💃")
    await fs.write(Path.combine(fromPath, Path.file("nested", "file")), "utf8", "🧞")
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-empty")))
    await fs.ensureDirectory(Path.combine(fromPath, Path.directory("nested-2", "deeply-nested")))

    await fs.move(fromPath, toPath)

    expect(
      await fs.read(Path.combine(toPath, Path.file("file")), "utf8")
    ).toEqual(
      "💃"
    )

    expect(
      await fs.read(Path.combine(toPath, Path.file("nested", "file")), "utf8")
    ).toEqual(
      "🧞"
    )

    expect(
      await fs.exists(Path.combine(toPath, Path.directory("nested-empty")))
    ).toBe(
      true
    )

    expect(
      await fs.exists(Path.combine(toPath, Path.directory("nested-2", "deeply-nested")))
    ).toBe(
      true
    )

    expect(
      await fs.exists(fromPath)
    ).toBe(
      false
    )

    await fs.move(
      Path.directory("public", "a"),
      Path.directory("public")
    )

    expect(
      await fs.exists(Path.directory("public", "b", "c", "nested-2", "deeply-nested"))
    ).toBe(
      false
    )

    expect(
      await fs.exists(Path.directory("public", "a"))
    ).toBe(
      false
    )

    expect(
      await fs.exists(Path.directory("public", "a", "b", "c", "d", "e", "nested-2", "deeply-nested"))
    ).toBe(
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

    expect(
      await fs.read(Path.combine(toPath, Path.file("file")), "utf8")
    ).toEqual(
      "💃"
    )

    expect(
      await fs.read(Path.combine(toPath, Path.file("nested", "file")), "utf8")
    ).toEqual(
      "🧞"
    )

    expect(
      await fs.exists(Path.combine(toPath, Path.directory("nested-empty")))
    ).toBe(
      true
    )

    expect(
      await fs.exists(Path.combine(toPath, Path.directory("nested-2", "deeply-nested")))
    ).toBe(
      true
    )

    expect(
      await fs.exists(fromPath)
    ).toBe(
      false
    )

    await fs.move(
      Path.directory("private", "a"),
      Path.directory("private")
    )

    expect(
      await fs.exists(Path.directory("public", "b", "c", "nested-2", "deeply-nested"))
    ).toBe(
      false
    )

    expect(
      await fs.exists(Path.directory("public", "a"))
    ).toBe(
      false
    )

    expect(
      await fs.exists(Path.directory("public", "a", "b", "c", "d", "e", "nested-2", "deeply-nested"))
    ).toBe(
      false
    )
  })

  it("moves a public file to the private partition", async () => {
    const fromPath = Path.file("public", "a", "b", "file")
    const toPath = Path.file("private", "a", "b", "c", "d", "file")

    const { capsuleCID } = await fs.write(fromPath, "utf8", "💃")
    const { capsuleRef } = await fs.move(fromPath, toPath)

    expect(await fs.read(toPath, "utf8")).toEqual("💃")
    expect(await fs.exists(fromPath)).toBe(false)
  })

  it("moves a private file to the public partition", async () => {
    const fromPath = Path.file("private", "a", "b", "file")
    const toPath = Path.file("public", "a", "b", "c", "d", "file")

    const { capsuleRef } = await fs.write(fromPath, "utf8", "💃")
    const { capsuleCID } = await fs.move(fromPath, toPath)

    expect(await fs.read(toPath, "utf8")).toEqual("💃")
    expect(await fs.exists(fromPath)).toBe(false)
  })


  // RENAMING
  // --------

  it("renames public files", async () => {
    await fs.write(Path.file("public", "a"), "bytes", new Uint8Array())
    await fs.rename(Path.file("public", "a"), "b")

    expect(
      await fs.exists(Path.file("public", "a"))
    ).toBe(
      false
    )

    expect(
      await fs.exists(Path.file("public", "b"))
    ).toBe(
      true
    )
  })

  it("renames private files", async () => {
    await fs.write(Path.file("private", "a"), "bytes", new Uint8Array())
    await fs.rename(Path.file("private", "a"), "b")

    expect(
      await fs.exists(Path.file("private", "a"))
    ).toBe(
      false
    )

    expect(
      await fs.exists(Path.file("private", "b"))
    ).toBe(
      true
    )
  })

  it("renames public directories", async () => {
    await fs.ensureDirectory(Path.directory("public", "a"))
    await fs.rename(Path.directory("public", "a"), "b")

    expect(
      await fs.exists(Path.directory("public", "a"))
    ).toBe(
      false
    )

    expect(
      await fs.exists(Path.directory("public", "b"))
    ).toBe(
      true
    )
  })

  it("renames private directories", async () => {
    await fs.ensureDirectory(Path.directory("private", "a"))
    await fs.rename(Path.directory("private", "a"), "b")

    expect(
      await fs.exists(Path.directory("private", "a"))
    ).toBe(
      false
    )

    expect(
      await fs.exists(Path.directory("private", "b"))
    ).toBe(
      true
    )
  })


  // PUBLISHING
  // ----------

  it("publishes & debounces by default", async () => {
    await new Promise(resolve => setTimeout(resolve, fsOpts.settleTimeBeforePublish * 1.5))

    const promise: Promise<CID> = new Promise((resolve, reject) => {
      setTimeout(reject, 10000)

      const listener = ({ dataRoot }: { dataRoot: CID }) => {
        fsOpts.eventEmitter.off("publish", listener)
        resolve(dataRoot)
      }

      fsOpts.eventEmitter.on("publish", listener)
    })

    const a = await fs.write(Path.file("private", "a"), "bytes", new Uint8Array())
    const b = await fs.write(Path.file("private", "b"), "bytes", new Uint8Array())
    const c = await fs.write(Path.file("private", "c"), "bytes", new Uint8Array())
    const d = await fs.write(Path.file("private", "d"), "bytes", new Uint8Array())

    expect(
      (await promise).toString()
    ).toEqual(
      d.dataRoot.toString()
    )

    expect((await a.publishingStatus).persisted).toBe(true)
    expect((await b.publishingStatus).persisted).toBe(true)
    expect((await c.publishingStatus).persisted).toBe(true)
    expect((await d.publishingStatus).persisted).toBe(true)
  })

  it("doesn't publish when asked not to do so", async () => {
    let published = false

    fsOpts.eventEmitter.on("publish", () => {
      published = true
    })

    await fs.mkdir(Path.directory("private", "dir"), { skipPublish: true })
    await fs.write(Path.file("public", "file"), "bytes", new Uint8Array(), { skipPublish: true })
    await fs.cp(Path.file("public", "file"), Path.file("private", "file"), { skipPublish: true })
    await fs.mv(Path.file("private", "file"), Path.file("private", "dir", "file"), { skipPublish: true })
    await fs.rename(Path.file("private", "dir", "file"), "renamed", { skipPublish: true })
    await fs.rm(Path.file("private", "dir", "renamed"), { skipPublish: true })

    await new Promise(resolve => setTimeout(resolve, fsOpts.settleTimeBeforePublish * 1.5))

    expect(published).toBe(false)
  })


  // EVENTS
  // ------
  // Other than "publish"

  it("emits an event for a mutation", async () => {
    const eventPromise: Promise<CID> = new Promise((resolve, reject) => {
      setTimeout(reject, 10000)

      fsOpts.eventEmitter.on("local-change", ({ dataRoot }) => {
        resolve(dataRoot)
      })
    })

    const mutationResult = await fs.write(Path.file("private", "file"), "bytes", new Uint8Array())

    expect(
      (await eventPromise).toString()
    ).toEqual(
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

    expect(
      await fs.read(Path.file("public", "file"), "utf8")
    ).toEqual(
      "💃"
    )
  })

  it("doesn't commit a transaction when an error occurs inside of the transaction", async () => {
    expect.assertions(1)

    await fs.transaction(async t => {
      await t.write(Path.file("private", "file"), "utf8", "💃")
      throw new Error("Whoops")
    }).catch(e => { })

    try {
      fs.read(Path.file("private", "file"), "utf8")
    } catch (e) {
      expect(e).toBeTruthy()
    }
  })

})