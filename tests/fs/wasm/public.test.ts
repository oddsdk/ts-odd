import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import { PublicFileWasm, PublicRootWasm } from "../../../src/fs/v3/PublicRootWasm.js"

import { HardLinks } from "../../../src/fs/types.js"
import { CID } from "multiformats"
import { components } from "../../helpers/components.js"



describe("the wasm public root", () => {

  const dependencies = components

  async function simpleExample() {
    const root = await PublicRootWasm.empty(dependencies)
    await root.mkdir([ "hello", "world" ])
    await root.historyStep()
    await root.add([ "hello", "actor", "James" ], Uint8arrays.fromString("Cameron?"))
    return root
  }

  describe("the simple example", () => {
    it("has a hello world directory", async () => {
      const root = await simpleExample()
      expect(await root.exists([ "hello", "world" ])).toEqual(true)
    })

    it("returns false with exist on non-existing directories", async () => {
      const root = await simpleExample()
      expect(await root.exists([ "bogus", "path" ])).toEqual(false)
    })

    it("store- and load-roundtrips", async () => {
      const cid = await (await simpleExample()).put()
      const root = await PublicRootWasm.fromCID(dependencies, cid)
      expect(await root.exists([ "hello", "world" ])).toEqual(true)
    })

    it("has a 'James' file", async () => {
      const root = await simpleExample()
      const result = await root.cat([ "hello", "actor", "James" ]) as Uint8Array
      expect(Uint8arrays.toString(result)).toEqual("Cameron?")
    })

    it("can list the 'hello' directory contents correctly", async () => {
      const root = await simpleExample()
      const lsResult = await root.ls([ "hello" ]) as HardLinks
      expect(lsResult[ "actor" ].name).toEqual("actor")
      expect(lsResult[ "actor" ].isFile).toEqual(false)
      expect(lsResult[ "actor" ].cid).toBeInstanceOf(CID)
      expect(lsResult[ "world" ].name).toEqual("world")
      expect(lsResult[ "world" ].isFile).toEqual(false)
      expect(lsResult[ "world" ].cid).toBeInstanceOf(CID)
    })

    it("can list the 'hello/actor' directory contents and shows a file", async () => {
      const root = await simpleExample()
      const lsResult = await root.ls([ "hello", "actor" ]) as HardLinks
      expect(lsResult[ "James" ].name).toEqual("James")
      expect(lsResult[ "James" ].isFile).toEqual(true)
    })

    it("can read the metadata of some file with .get()", async () => {
      const root = await simpleExample()
      const file = await root.get([ "hello", "actor", "James" ])
      if (!(file instanceof PublicFileWasm)) {
        throw new Error(`Expected file to be instance of PublicFileWasm`)
      }
      expect(file.header.metadata.isFile).toEqual(true)
      expect(typeof file.header.metadata.unixMeta.ctime).toBe("number")
      expect(typeof file.header.metadata.unixMeta.mtime).toBe("number")
    })
  })

})
