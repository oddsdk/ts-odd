import { strict as assert } from "assert"
import * as fc from "fast-check"
import * as Path from "./index.js"
import { DirectoryPath, FilePath, RootBranch } from "./index.js"

describe("Path functions", () => {
  // CREATION

  it("creates directory paths", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        assert.deepEqual(
          Path.directory(...data),
          { directory: data }
        )
      })
    )

    assert.throws(() => Path.directory("/"))

    // Type testing
    const a: Path.Directory<Path.Partitioned<Path.Private>> = Path.directory("private")
    const b: Path.Directory<Path.PartitionedNonEmpty<Path.Public>> = Path.directory("public", "a")
    const c: Path.Directory<Path.Segments> = Path.directory("private", "a", "b")
  })

  it("creates file paths", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        assert.deepEqual(
          Path.file(...data),
          { file: data }
        )
      })
    )

    assert.throws(() => Path.file("/"))

    // Type testing
    const a: Path.File<Path.PartitionedNonEmpty<Path.Private>> = Path.file("private", "a")
    const b: Path.File<Path.Segments> = Path.file("private", "a", "b")
  })

  it("creates directory paths with fromKind", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        assert.deepEqual(
          Path.fromKind(Path.Kind.Directory, ...data),
          { directory: data }
        )
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
        assert.deepEqual(
          Path.fromKind(Path.Kind.File, ...data),
          { file: data }
        )
      })
    )

    // Type testing
    const a: Path.File<Path.PartitionedNonEmpty<Path.Private>> = Path.fromKind(Path.Kind.File, "private", "a")
    const b: Path.File<Path.Segments> = Path.fromKind(Path.Kind.File, "private", "a", "b")
  })

  // POSIX

  it("creates a path from a POSIX formatted string", () => {
    assert.deepEqual(
      Path.fromPosix("foo/bar/"),
      { directory: ["foo", "bar"] }
    )

    assert.deepEqual(
      Path.fromPosix("/foo/bar/"),
      { directory: ["foo", "bar"] }
    )

    assert.deepEqual(
      Path.fromPosix("/"),
      { directory: [] }
    )

    assert.deepEqual(
      Path.fromPosix("foo/bar"),
      { file: ["foo", "bar"] }
    )

    assert.deepEqual(
      Path.fromPosix("/foo/bar"),
      { file: ["foo", "bar"] }
    )
  })

  it("converts a path to the POSIX format", () => {
    assert.equal(
      Path.toPosix({ directory: ["foo", "bar"] }),
      "foo/bar/"
    )

    assert.equal(
      Path.toPosix({ directory: [] }),
      ""
    )

    assert.equal(
      Path.toPosix({ file: ["foo", "bar"] }),
      "foo/bar"
    )
  })

  // 🛠

  it("can create app-data paths", () => {
    const appInfo = {
      name: "Tests",
      creator: "Fission",
    }

    const root: DirectoryPath<Path.PartitionedNonEmpty<Path.Private>> = Path.appData(
      "private",
      appInfo
    )

    assert.deepEqual(
      root,
      { directory: [RootBranch.Private, "Apps", appInfo.creator, appInfo.name] }
    )

    const dir: DirectoryPath<Path.PartitionedNonEmpty<Path.Private>> = Path.appData(
      "private",
      appInfo,
      Path.directory("a")
    )

    assert.deepEqual(
      dir,
      { directory: [RootBranch.Private, "Apps", appInfo.creator, appInfo.name, "a"] }
    )

    const file: FilePath<Path.PartitionedNonEmpty<Path.Public>> = Path.appData(
      "public",
      appInfo,
      Path.file("a")
    )

    assert.deepEqual(
      file,
      { file: [RootBranch.Public, "Apps", appInfo.creator, appInfo.name, "a"] }
    )
  })

  it("can be combined", () => {
    const dir: DirectoryPath<Path.Segments> = Path.combine(
      Path.directory("a"),
      Path.directory("b")
    )

    assert.deepEqual(
      dir,
      { directory: ["a", "b"] }
    )

    const file: FilePath<Path.Segments> = Path.combine(
      Path.directory("a"),
      Path.file("b")
    )

    assert.deepEqual(
      file,
      { file: ["a", "b"] }
    )

    // Type testing
    const a: DirectoryPath<Path.PartitionedNonEmpty<Path.Private>> = Path.combine(
      Path.directory("private"),
      Path.directory("a")
    )

    const aa: FilePath<Path.Partitioned<Path.Public>> = Path.combine(
      Path.directory("public"),
      Path.file("a")
    )

    const b: DirectoryPath<Path.Partitioned<Path.Private>> = Path.combine(
      Path.directory("private"),
      Path.directory()
    )

    const bb: FilePath<Path.Partitioned<Path.Public>> = Path.combine(
      Path.directory("public"),
      Path.file()
    )

    const c: DirectoryPath<Path.PartitionedNonEmpty<Path.Private>> = Path.combine(
      Path.directory("private"),
      Path.directory("a")
    )

    const cc: FilePath<Path.PartitionedNonEmpty<Path.Public>> = Path.combine(
      Path.directory("public"),
      Path.file("a")
    )
  })

  it("supports isOnRootBranch", () => {
    assert.equal(
      Path.isOnRootBranch(
        RootBranch.Private,
        Path.directory(RootBranch.Private, "a")
      ),
      true
    )

    assert.equal(
      Path.isOnRootBranch(
        RootBranch.Public,
        Path.directory(RootBranch.Private, "a")
      ),
      false
    )
  })

  it("supports isDirectory", () => {
    assert.equal(
      Path.isDirectory(
        Path.directory(RootBranch.Private)
      ),
      true
    )

    assert.equal(
      Path.isDirectory(
        Path.file("foo")
      ),
      false
    )
  })

  it("supports isFile", () => {
    assert.equal(
      Path.isFile(
        Path.file("foo")
      ),
      true
    )

    assert.equal(
      Path.isFile(
        Path.directory(RootBranch.Private)
      ),
      false
    )
  })

  it("supports isRootDirectory", () => {
    assert.equal(
      Path.isRootDirectory(
        Path.root()
      ),
      true
    )

    assert.equal(
      Path.isRootDirectory(
        Path.directory()
      ),
      true
    )

    assert.equal(
      Path.isRootDirectory(
        Path.directory(RootBranch.Private)
      ),
      false
    )
  })

  it("supports isSamePartition", () => {
    assert.equal(
      Path.isSamePartition(
        Path.directory(RootBranch.Private),
        Path.directory(RootBranch.Private)
      ),
      true
    )

    assert.equal(
      Path.isSamePartition(
        Path.directory(RootBranch.Private),
        Path.directory(RootBranch.Public)
      ),
      false
    )
  })

  it("supports isSameKind", () => {
    assert.equal(
      Path.isSameKind(
        Path.directory(),
        Path.file()
      ),
      false
    )

    assert.equal(
      Path.isSameKind(
        Path.file(),
        Path.directory()
      ),
      false
    )

    assert.equal(
      Path.isSameKind(
        Path.directory(),
        Path.directory()
      ),
      true
    )

    assert.equal(
      Path.isSameKind(
        Path.file(),
        Path.file()
      ),
      true
    )
  })

  it("has kind", () => {
    assert.equal(
      Path.kind(Path.directory()),
      Path.Kind.Directory
    )

    assert.equal(
      Path.kind(Path.file()),
      Path.Kind.File
    )
  })

  it("supports map", () => {
    assert.deepEqual(
      Path.map(
        p => [...p, "bar"],
        Path.directory("foo")
      ),
      { directory: ["foo", "bar"] }
    )

    assert.deepEqual(
      Path.map(
        p => [...p, "bar"],
        Path.file("foo")
      ),
      { file: ["foo", "bar"] }
    )
  })

  it("supports parent", () => {
    assert.deepEqual(
      Path.parent(
        Path.directory("foo")
      ),
      Path.root()
    )

    assert.deepEqual(
      Path.parent(
        Path.file("foo")
      ),
      Path.root()
    )

    assert.equal(
      Path.parent(
        Path.root()
      ),
      null
    )

    // Type testing
    const a: DirectoryPath<Path.PartitionedNonEmpty<Path.Partition>> = Path.parent({
      directory: ["private", "a", "b"],
    })

    const a_: DirectoryPath<Path.SegmentsNonEmpty> = Path.parent({
      directory: ["random", "a", "b"],
    })

    const b: DirectoryPath<Path.Partitioned<Path.Partition>> = Path.parent({
      directory: ["private", "a"],
    })

    const b_: DirectoryPath<Path.Segments> = Path.parent({
      directory: ["random", "a"],
    })

    const c: DirectoryPath<Path.Segments> = Path.parent({
      directory: ["private"],
    })

    const c_: DirectoryPath<Path.Segments> = Path.parent({
      directory: ["random"],
    })

    const x: null = Path.parent({
      directory: [],
    })
  })

  it("supports removePartition", () => {
    assert.deepEqual(
      Path.removePartition(
        Path.directory("foo")
      ),
      { directory: [] }
    )

    assert.deepEqual(
      Path.removePartition(
        Path.directory("foo", "bar")
      ),
      Path.directory("bar")
    )
  })

  it("supports replaceTerminus", () => {
    assert.deepEqual(
      Path.replaceTerminus(
        Path.file("private", "a", "b"),
        "c"
      ),
      Path.file("private", "a", "c")
    )

    // Type testing
    const a: DirectoryPath<Path.PartitionedNonEmpty<Path.Partition>> = Path.replaceTerminus({
      directory: ["private", "a"],
    }, "b")

    const b: FilePath<Path.PartitionedNonEmpty<Path.Partition>> = Path.replaceTerminus({
      file: ["private", "a"],
    }, "b")

    const c: DirectoryPath<Path.SegmentsNonEmpty> = Path.replaceTerminus({
      directory: ["a"],
    }, "b")

    const d: FilePath<Path.SegmentsNonEmpty> = Path.replaceTerminus({
      file: ["a"],
    }, "b")
  })

  it("correctly unwraps", () => {
    assert.deepEqual(
      Path.unwrap(
        Path.directory("foo")
      ),
      ["foo"]
    )

    assert.deepEqual(
      Path.unwrap(
        Path.file("foo")
      ),
      ["foo"]
    )
  })
})
