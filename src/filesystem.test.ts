import expect from "expect"

import { Storage } from "../tests/helpers/in-memory-storage.js"
import { readKey } from "./filesystem.js"
import { setImplementations } from "./setup.js"

describe("read key", () => {
  const store = new Storage()

  before(() => {
    setImplementations({
      storage: {
        getItem: store.getItem,
        setItem: store.setItem,
        removeItem: store.removeItem,
        clear: store.clear
      }
    })

  })

  afterEach(async () => {
    await store.clear()
  })

  it("creates and stores a key", async () => {
    await readKey()

    const key = store.getItem("readKey")
    expect(key).toBeDefined()
  })

  it("recovers a stored key", async () => {
    const storedKey = await readKey()

    const key = await readKey()
    expect(key).toEqual(storedKey)
  })
})