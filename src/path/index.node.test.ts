import expect from "expect"
import * as fc from "fast-check"
import * as pathing from "./path.js"


describe("the path helpers", () => {



  // CREATION


  it("creates directory paths", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        expect(pathing.directory(...data)).toEqual({
          directory: data
        })
      })
    )

    expect(() =>
      pathing.directory("/")
    ).toThrow()
  })

  it("creates file paths", () => {
    fc.assert(
      fc.property(fc.array(fc.hexaString()), data => {
        expect(pathing.file(...data)).toEqual({
          file: data
        })
      })
    )

    expect(() =>
      pathing.file("/")
    ).toThrow()
  })



  // POSIX


  it("creates a path from a POSIX formatted string", () => {
    expect(
      pathing.fromPosix("foo/bar/")
    ).toEqual(
      { directory: [ "foo", "bar" ] }
    )

    expect(
      pathing.fromPosix("/foo/bar/")
    ).toEqual(
      { directory: [ "foo", "bar" ] }
    )

    expect(
      pathing.fromPosix("/")
    ).toEqual(
      { directory: [] }
    )

    expect(
      pathing.fromPosix("foo/bar")
    ).toEqual(
      { file: [ "foo", "bar" ] }
    )

    expect(
      pathing.fromPosix("/foo/bar")
    ).toEqual(
      { file: [ "foo", "bar" ] }
    )
  })


  it("converts a path to the POSIX format", () => {
    expect(
      pathing.toPosix({ directory: [ "foo", "bar" ] })
    ).toEqual(
      "foo/bar/"
    )

    expect(
      pathing.toPosix({ directory: [] })
    ).toEqual(
      ""
    )

    expect(
      pathing.toPosix({ file: [ "foo", "bar" ] })
    ).toEqual(
      "foo/bar"
    )
  })



  // 🛠


  it("can be combined", () => {
    expect(
      pathing.combine(
        pathing.directory("a"),
        pathing.directory("b")
      )
    ).toEqual(
      { directory: [ "a", "b" ] }
    )

    expect(
      pathing.combine(
        pathing.directory("a"),
        pathing.file("b")
      )
    ).toEqual(
      { file: [ "a", "b" ] }
    )
  })


  it("supports isBranch", () => {
    expect(
      pathing.isBranch(
        pathing.Branch.Private,
        pathing.directory(pathing.Branch.Private, "a")
      )
    ).toBe(true)

    expect(
      pathing.isBranch(
        pathing.Branch.Public,
        pathing.directory(pathing.Branch.Private, "a")
      )
    ).toBe(false)
  })


  it("supports isDirectory", () => {
    expect(
      pathing.isDirectory(
        pathing.directory(pathing.Branch.Private)
      )
    ).toBe(true)

    expect(
      pathing.isDirectory(
        pathing.file("foo")
      )
    ).toBe(false)
  })


  it("supports isFile", () => {
    expect(
      pathing.isFile(
        pathing.file("foo")
      )
    ).toBe(true)

    expect(
      pathing.isFile(
        pathing.directory(pathing.Branch.Private)
      )
    ).toBe(false)
  })


  it("supports isRootDirectory", () => {
    expect(
      pathing.isRootDirectory(
        pathing.root()
      )
    ).toBe(true)

    expect(
      pathing.isRootDirectory(
        pathing.directory()
      )
    ).toBe(true)

    expect(
      pathing.isRootDirectory(
        pathing.directory(pathing.Branch.Private)
      )
    ).toBe(false)
  })


  it("supports isSameBranch", () => {
    expect(
      pathing.isSameBranch(
        pathing.directory(pathing.Branch.Private),
        pathing.directory(pathing.Branch.Private)
      )
    ).toBe(true)

    expect(
      pathing.isSameBranch(
        pathing.directory(pathing.Branch.Private),
        pathing.directory(pathing.Branch.Public)
      )
    ).toBe(false)
  })


  it("supports isSameKind", () => {
    expect(
      pathing.isSameKind(
        pathing.directory(),
        pathing.file()
      )
    ).toBe(false)

    expect(
      pathing.isSameKind(
        pathing.file(),
        pathing.directory()
      )
    ).toBe(false)

    expect(
      pathing.isSameKind(
        pathing.directory(),
        pathing.directory()
      )
    ).toBe(true)

    expect(
      pathing.isSameKind(
        pathing.file(),
        pathing.file()
      )
    ).toBe(true)
  })


  it("has kind", () => {
    expect(
      pathing.kind(pathing.directory())
    ).toEqual(
      pathing.Kind.Directory
    )

    expect(
      pathing.kind(pathing.file())
    ).toEqual(
      pathing.Kind.File
    )
  })


  it("supports map", () => {
    expect(
      pathing.map(
        p => [ ...p, "bar" ],
        pathing.directory("foo")
      )
    ).toEqual(
      { directory: [ "foo", "bar" ] }
    )

    expect(
      pathing.map(
        p => [ ...p, "bar" ],
        pathing.file("foo")
      )
    ).toEqual(
      { file: [ "foo", "bar" ] }
    )
  })


  it("supports parent", () => {
    expect(
      pathing.parent(
        pathing.directory("foo")
      )
    ).toEqual(
      pathing.root()
    )

    expect(
      pathing.parent(
        pathing.file("foo")
      )
    ).toEqual(
      pathing.root()
    )

    expect(
      pathing.parent(
        pathing.root()
      )
    ).toEqual(
      null
    )
  })


  it("supports removeBranch", () => {
    expect(
      pathing.removeBranch(
        pathing.directory("foo")
      )
    ).toEqual(
      { directory: [] }
    )

    expect(
      pathing.removeBranch(
        pathing.directory("foo", "bar")
      )
    ).toEqual(
      pathing.directory("bar")
    )
  })


  it("correctly unwraps", () => {
    expect(
      pathing.unwrap(
        pathing.directory("foo")
      )
    ).toEqual(
      [ "foo" ]
    )

    expect(
      pathing.unwrap(
        pathing.file("foo")
      )
    ).toEqual(
      [ "foo" ]
    )
  })

})