/**
 * @jest-environment jsdom
 */
import * as fc from 'fast-check';
import * as pathing from './path'


// CREATION


test("Creating a directory path", () => {
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

test("Creating a file path", () => {
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


test("Creating a path from a POSIX formatted string", () => {
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


test("Converting a path to the POSIX format", () => {
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


test("combine", () => {
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


test("isBranch", () => {
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


test("isDirectory", () => {
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


test("isFile", () => {
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


test("isRootDirectory", () => {
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


test("isSameBranch", () => {
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


test("map", () => {
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


test("parent", () => {
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


test("removeBranch", () => {
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


test("unwrap", () => {
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
