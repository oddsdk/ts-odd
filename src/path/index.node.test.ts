import expect from "expect"
import * as fc from "fast-check"
import * as Path from "./index.js"
import { DirectoryPath, FilePath } from "./index.js"


describe("the path helpers", () => {



  // CREATION


  it("creates directory paths", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        expect(Path.directory(...data)).toEqual({
          directory: data
        })
      })
    )

    expect(() =>
      Path.directory("/")
    ).toThrow()
  })

  it("creates file paths", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        expect(Path.file(...data)).toEqual({
          file: data
        })
      })
    )

    expect(() =>
      Path.file("/")
    ).toThrow()
  })



  // POSIX


  it("creates a path from a POSIX formatted string", () => {
    expect(
      Path.fromPosix("foo/bar/")
    ).toEqual(
      { directory: [ "foo", "bar" ] }
    )

    expect(
      Path.fromPosix("/foo/bar/")
    ).toEqual(
      { directory: [ "foo", "bar" ] }
    )

    expect(
      Path.fromPosix("/")
    ).toEqual(
      { directory: [] }
    )

    expect(
      Path.fromPosix("foo/bar")
    ).toEqual(
      { file: [ "foo", "bar" ] }
    )

    expect(
      Path.fromPosix("/foo/bar")
    ).toEqual(
      { file: [ "foo", "bar" ] }
    )
  })


  it("converts a path to the POSIX format", () => {
    expect(
      Path.toPosix({ directory: [ "foo", "bar" ] })
    ).toEqual(
      "foo/bar/"
    )

    expect(
      Path.toPosix({ directory: [] })
    ).toEqual(
      ""
    )

    expect(
      Path.toPosix({ file: [ "foo", "bar" ] })
    ).toEqual(
      "foo/bar"
    )
  })



  // 🛠


  it("can create app-data paths", () => {
    const appInfo = {
      name: "Tests",
      creator: "Fission"
    }

    const root: DirectoryPath<Path.Branched> = Path.appData(
      appInfo
    )

    expect(
      root
    ).toEqual(
      { directory: [ Path.Branch.Private, "Apps", appInfo.creator, appInfo.name ] }
    )

    const dir: DirectoryPath<Path.Branched> = Path.appData(
      appInfo,
      Path.directory("a")
    )

    expect(
      dir
    ).toEqual(
      { directory: [ Path.Branch.Private, "Apps", appInfo.creator, appInfo.name, "a" ] }
    )

    const file: FilePath<Path.Branched> = Path.appData(
      appInfo,
      Path.file("a")
    )

    expect(
      file
    ).toEqual(
      { file: [ Path.Branch.Private, "Apps", appInfo.creator, appInfo.name, "a" ] }
    )
  })


  it("can be combined", () => {
    const dir: DirectoryPath<Path.Segments> = Path.combine(
      Path.directory("a"),
      Path.directory("b")
    )

    expect(
      dir
    ).toEqual(
      { directory: [ "a", "b" ] }
    )

    const file: FilePath<Path.Segments> = Path.combine(
      Path.directory("a"),
      Path.file("b")
    )

    expect(
      file
    ).toEqual(
      { file: [ "a", "b" ] }
    )
  })


  it("supports isBranch", () => {
    expect(
      Path.isBranch(
        Path.Branch.Private,
        Path.directory(Path.Branch.Private, "a")
      )
    ).toBe(true)

    expect(
      Path.isBranch(
        Path.Branch.Public,
        Path.directory(Path.Branch.Private, "a")
      )
    ).toBe(false)
  })


  it("supports isDirectory", () => {
    expect(
      Path.isDirectory(
        Path.directory(Path.Branch.Private)
      )
    ).toBe(true)

    expect(
      Path.isDirectory(
        Path.file("foo")
      )
    ).toBe(false)
  })


  it("supports isFile", () => {
    expect(
      Path.isFile(
        Path.file("foo")
      )
    ).toBe(true)

    expect(
      Path.isFile(
        Path.directory(Path.Branch.Private)
      )
    ).toBe(false)
  })


  it("supports isRootDirectory", () => {
    expect(
      Path.isRootDirectory(
        Path.root()
      )
    ).toBe(true)

    expect(
      Path.isRootDirectory(
        Path.directory()
      )
    ).toBe(true)

    expect(
      Path.isRootDirectory(
        Path.directory(Path.Branch.Private)
      )
    ).toBe(false)
  })


  it("supports isSameBranch", () => {
    expect(
      Path.isSameBranch(
        Path.directory(Path.Branch.Private),
        Path.directory(Path.Branch.Private)
      )
    ).toBe(true)

    expect(
      Path.isSameBranch(
        Path.directory(Path.Branch.Private),
        Path.directory(Path.Branch.Public)
      )
    ).toBe(false)
  })


  it("supports isSameKind", () => {
    expect(
      Path.isSameKind(
        Path.directory(),
        Path.file()
      )
    ).toBe(false)

    expect(
      Path.isSameKind(
        Path.file(),
        Path.directory()
      )
    ).toBe(false)

    expect(
      Path.isSameKind(
        Path.directory(),
        Path.directory()
      )
    ).toBe(true)

    expect(
      Path.isSameKind(
        Path.file(),
        Path.file()
      )
    ).toBe(true)
  })


  it("has kind", () => {
    expect(
      Path.kind(Path.directory())
    ).toEqual(
      Path.Kind.Directory
    )

    expect(
      Path.kind(Path.file())
    ).toEqual(
      Path.Kind.File
    )
  })


  it("supports map", () => {
    expect(
      Path.map(
        p => [ ...p, "bar" ],
        Path.directory("foo")
      )
    ).toEqual(
      { directory: [ "foo", "bar" ] }
    )

    expect(
      Path.map(
        p => [ ...p, "bar" ],
        Path.file("foo")
      )
    ).toEqual(
      { file: [ "foo", "bar" ] }
    )
  })


  it("supports parent", () => {
    expect(
      Path.parent(
        Path.directory("foo")
      )
    ).toEqual(
      Path.root()
    )

    expect(
      Path.parent(
        Path.file("foo")
      )
    ).toEqual(
      Path.root()
    )

    expect(
      Path.parent(
        Path.root()
      )
    ).toEqual(
      null
    )
  })


  it("supports removeBranch", () => {
    expect(
      Path.removeBranch(
        Path.directory("foo")
      )
    ).toEqual(
      { directory: [] }
    )

    expect(
      Path.removeBranch(
        Path.directory("foo", "bar")
      )
    ).toEqual(
      Path.directory("bar")
    )
  })


  it("correctly unwraps", () => {
    expect(
      Path.unwrap(
        Path.directory("foo")
      )
    ).toEqual(
      [ "foo" ]
    )

    expect(
      Path.unwrap(
        Path.file("foo")
      )
    ).toEqual(
      [ "foo" ]
    )
  })

})