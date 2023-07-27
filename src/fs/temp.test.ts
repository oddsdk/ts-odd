import assert from "assert"
import { exporter } from "ipfs-unixfs-exporter"
import all from "it-all"
import * as Uint8arrays from "uint8arrays"

import * as Events from "../events.js"
import * as Path from "../path/index.js"

import * as Cabinet from "../repositories/cabinet.js"
import * as CIDLog from "../repositories/cid-log.js"

import { account, agent, depot, identifier, manners, storage } from "../../tests/helpers/components.js"
import { CID } from "../common/cid.js"
import { createEmitter } from "../events.js"
import { accountDID, selfDelegateCapabilities } from "../fileSystem.js"
import { FileSystem } from "./class.js"

describe("File System Class", async () => {
  let fs: FileSystem

  const fsOpts = {
    dependencies: { account, agent, depot, identifier, manners },
    eventEmitter: createEmitter<Events.FileSystem>(),
    settleTimeBeforePublish: 250,
  }

  // HOOKS
  // -----

  beforeEach(async () => {
    const cidLog = await CIDLog.create({ storage })
    const cabinet = await Cabinet.create({ storage })

    const did = () => accountDID({ account, identifier, cabinet })
    const updateDataRoot = account.updateDataRoot

    fs = await FileSystem.empty({ ...fsOpts, cidLog, cabinet, did, updateDataRoot })

    const mounts = await fs.mountPrivateNodes([
      { path: Path.root() },
    ])

    await cabinet.addUcans([
      await selfDelegateCapabilities(identifier),
    ])
  })

  it("temp test", async () => {
    const path = Path.file("public", "a")

    const { contentCID } = await fs.write(
      path,
      "bytes",
      new TextEncoder().encode("🚀")
    )

    assert.equal(await fs.read(path, "utf8"), "🚀")
  })
})
