import expect from "expect"
import * as uint8arrays from "uint8arrays"

import "../../../src/setup/node.js"
import { PublicRootWasm } from "../../../src/fs/v3/PublicRootWasm.js"
import * as ipfsConfig from "../../../src/ipfs/config.js"
import { HardLinks } from "../../../src/fs/types.js"



describe("the wasm public root", () => {

  async function simpleExample() {
    const ipfs = await ipfsConfig.get()
    const root = await PublicRootWasm.empty(ipfs)
    await root.mkdir(["hello", "world"])
    await root.historyStep()
    await root.add(["hello", "actor", "James"], "Cameron?")
    return root
  }

  describe("the simple example", () => {
    it("has a hello world directory", async () => {
      const root = await simpleExample()
      expect(await root.exists(["hello", "world"])).toEqual(true)
    })

    it("store- and load-roundtrips", async () => {
      const cid = await (await simpleExample()).put()
      const root = await PublicRootWasm.fromCID(await ipfsConfig.get(), cid)
      expect(await root.exists(["hello", "world"])).toEqual(true)
    })

    it("has a 'James' file", async () => {
      const root = await simpleExample()
      const result = await root.cat(["hello", "actor", "James"]) as Uint8Array
      expect(uint8arrays.toString(result)).toEqual("Cameron?")
    })

    it("can list the 'hello' directory contents correctly", async () => {
      const root = await simpleExample()
      const lsResult = await root.ls(["hello"]) as HardLinks
      expect(lsResult["actor"].name).toEqual("actor")
      expect(lsResult["actor"].isFile).toEqual(false)
      expect(lsResult["world"].name).toEqual("world")
      expect(lsResult["world"].isFile).toEqual(false)
    })

    it("can list the 'hello/actor' directory contents and shows a file", async () => {
      const root = await simpleExample()
      const lsResult = await root.ls(["hello", "actor"]) as HardLinks
      expect(lsResult["James"].name).toEqual("James")
      expect(lsResult["James"].isFile).toEqual(true)
    })
  })

})
