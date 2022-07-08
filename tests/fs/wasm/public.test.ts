import expect from "expect"
import * as fc from "fast-check"
import * as uint8arrays from "uint8arrays"

import "../../../src/setup/node.js"
import { PublicTreeWasm } from "../../../src/fs/v3/PublicTreeWasm.js"
import * as ipfsConfig from "../../../src/ipfs/config.js"
import { HardLinks } from "../../../src/fs/types.js"



describe("the wasm public tree", () => {

  async function simpleExample() {
    const ipfs = await ipfsConfig.get()
    const tree = PublicTreeWasm.empty(ipfs)
    await tree.mkdir(["hello", "world"])
    await tree.add(["hello", "actor", "James"], "Cameron?")
    return tree
  }

  describe("the simple example", () => {
    it("has a hello world directory", async () => {
      const tree = await simpleExample()
      expect(await tree.exists(["hello", "world"])).toEqual(true)
    })

    it("has a 'James' file", async () => {
      const tree = await simpleExample()
      const result = await tree.cat(["hello", "actor", "James"]) as Uint8Array
      expect(uint8arrays.toString(result)).toEqual("Cameron?")
    })

    it("can list the 'hello' directory contents correctly", async () => {
      const tree = await simpleExample()
      const lsResult = await tree.ls(["hello"]) as HardLinks
      console.log(lsResult)
      expect(lsResult["actor"].name).toEqual("actor")
      expect(lsResult["actor"].isFile).toEqual(false)
      expect(lsResult["world"].name).toEqual("world")
      expect(lsResult["world"].isFile).toEqual(false)
    })

    it("can list the 'hello/actor' directory contents and shows a file", async () => {
      const tree = await simpleExample()
      const lsResult = await tree.ls(["hello", "actor"]) as HardLinks
      console.log(lsResult)
      expect(lsResult["James"].name).toEqual("James")
      expect(lsResult["James"].isFile).toEqual(true)
    })
  })

})
