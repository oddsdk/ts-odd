import expect from "expect"
import * as fc from "fast-check"
import * as Path from "./index.js"
import { DirectoryPath, FilePath, RootBranch } from "./index.js"


describe("Path functions", () => {



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

    // Type testing
    const a: Path.Directory<Path.Partitioned<Path.Private>> = Path.directory("private")
    const b: Path.Directory<Path.PartitionedNonEmpty<Path.Public>> = Path.directory("public", "a")
    const c: Path.Directory<Path.Segments> = Path.directory("private", "a", "b")
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

    // Type testing
    const a: Path.File<Path.PartitionedNonEmpty<Path.Private>> = Path.file("private", "a")
    const b: Path.File<Path.Segments> = Path.file("private", "a", "b")
  })


  it("creates directory paths with fromKind", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        expect(Path.fromKind(Path.Kind.Directory, ...data)).toEqual({
          directory: data
        })
      })
    )

    // Type testing
    const a: Path.Directory<Path.Partitioned<Path.Private>> = Path.fromKind(Path.Kind.Directory, "private")
    const b: Path.Directory<Path.PartitionedNonEmpty<Path.Public>> = Path.fromKind(Path.Kind.Directory, "public", "a")
    const c: Path.Directory<Path.Segments> = Path.fromKind(Path.Kind.Directory, "private", "a", "b")
  })


  it("creates file paths with fromKind", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        expect(Path.fromKind(Path.Kind.File, ...data)).toEqual({
          file: data
        })
      })
    )

    // Type testing
    const a: Path.File<Path.PartitionedNonEmpty<Path.Private>> = Path.fromKind(Path.Kind.File, "private", "a")
    const b: Path.File<Path.Segments> = Path.fromKind(Path.Kind.File, "private", "a", "b")
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

    const root: DirectoryPath<Path.PartitionedNonEmpty<Path.Private>> = Path.appData(
      appInfo
    )

    expect(
      root
    ).toEqual(
      { directory: [ RootBranch.Private, "Apps", appInfo.creator, appInfo.name ] }
    )

    const dir: DirectoryPath<Path.PartitionedNonEmpty<Path.Private>> = Path.appData(
      appInfo,
      Path.directory("a")
    )

    expect(
      dir
    ).toEqual(
      { directory: [ RootBranch.Private, "Apps", appInfo.creator, appInfo.name, "a" ] }
    )

    const file: FilePath<Path.PartitionedNonEmpty<Path.Private>> = Path.appData(
      appInfo,
      Path.file("a")
    )

    expect(
      file
    ).toEqual(
      { file: [ RootBranch.Private, "Apps", appInfo.creator, appInfo.name, "a" ] }
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

    // Type testing
    const a: DirectoryPath<Path.PartitionedNonEmpty<Path.Private>> = Path.combine(
      Path.directory("private"),
      Path.directory("a"),
    )

    const aa: FilePath<Path.Partitioned<Path.Public>> = Path.combine(
      Path.directory("public"),
      Path.file("a"),
    )

    const b: DirectoryPath<Path.Partitioned<Path.Private>> = Path.combine(
      Path.directory("private"),
      Path.directory(),
    )

    const bb: FilePath<Path.Partitioned<Path.Public>> = Path.combine(
      Path.directory("public"),
      Path.file(),
    )

    const c: DirectoryPath<Path.PartitionedNonEmpty<Path.Private>> = Path.combine(
      Path.directory("private"),
      Path.directory("a"),
    )

    const cc: FilePath<Path.PartitionedNonEmpty<Path.Public>> = Path.combine(
      Path.directory("public"),
      Path.file("a"),
    )
  })


  it("supports isOnRootBranch", () => {
    expect(
      Path.isOnRootBranch(
        RootBranch.Private,
        Path.directory(RootBranch.Private, "a")
      )
    ).toBe(true)

    expect(
      Path.isOnRootBranch(
        RootBranch.Public,
        Path.directory(RootBranch.Private, "a")
      )
    ).toBe(false)
  })


  it("supports isDirectory", () => {
    expect(
      Path.isDirectory(
        Path.directory(RootBranch.Private)
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
        Path.directory(RootBranch.Private)
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
        Path.directory(RootBranch.Private)
      )
    ).toBe(false)
  })


  it("supports isSamePartition", () => {
    expect(
      Path.isSamePartition(
        Path.directory(RootBranch.Private),
        Path.directory(RootBranch.Private)
      )
    ).toBe(true)

    expect(
      Path.isSamePartition(
        Path.directory(RootBranch.Private),
        Path.directory(RootBranch.Public)
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

    // Type testing
    const a: DirectoryPath<Path.PartitionedNonEmpty<Path.Partition>> = Path.parent({
      directory: [ "private", "a", "b" ]
    })

    const a_: DirectoryPath<Path.SegmentsNonEmpty> = Path.parent({
      directory: [ "random", "a", "b" ]
    })

    const b: DirectoryPath<Path.Partitioned<Path.Partition>> = Path.parent({
      directory: [ "private", "a" ]
    })

    const b_: DirectoryPath<Path.Segments> = Path.parent({
      directory: [ "random", "a" ]
    })

    const c: DirectoryPath<Path.Segments> = Path.parent({
      directory: [ "private" ]
    })

    const c_: DirectoryPath<Path.Segments> = Path.parent({
      directory: [ "random" ]
    })

    const x: null = Path.parent({
      directory: []
    })
  })


  it("supports removePartition", () => {
    expect(
      Path.removePartition(
        Path.directory("foo")
      )
    ).toEqual(
      { directory: [] }
    )

    expect(
      Path.removePartition(
        Path.directory("foo", "bar")
      )
    ).toEqual(
      Path.directory("bar")
    )
  })


  it("supports replaceTerminus", () => {
    expect(
      Path.replaceTerminus(
        Path.file("private", "a", "b"),
        "c"
      )
    ).toEqual(
      Path.file("private", "a", "c")
    )

    // Type testing
    const a: DirectoryPath<Path.PartitionedNonEmpty<Path.Partition>> = Path.replaceTerminus({
      directory: [ "private", "a" ]
    }, "b")

    const b: FilePath<Path.PartitionedNonEmpty<Path.Partition>> = Path.replaceTerminus({
      file: [ "private", "a" ]
    }, "b")

    const c: DirectoryPath<Path.SegmentsNonEmpty> = Path.replaceTerminus({
      directory: [ "a" ]
    }, "b")

    const d: FilePath<Path.SegmentsNonEmpty> = Path.replaceTerminus({
      file: [ "a" ]
    }, "b")
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