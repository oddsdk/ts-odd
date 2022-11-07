import * as Uint8arrays from "uint8arrays"
import expect from "expect"

import * as Path from "../../src/path/index.js"
import * as Versions from "../../src/fs/versions.js"
import { checkFileSystemVersion } from "../../src/filesystem.js"

import { configuration, depot } from "../helpers/components.js"
import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem versioning system", () => {

    const content = Uint8arrays.fromString("Hello, World!", "utf8")

    it("throws an error if the version is too high", async function () {
        const fs = await emptyFilesystem()
        await fs.write(Path.file("public", "some", "file.txt"), content)
        await fs.root.setVersion(Versions.encode(Versions.latest.major + 2, 0, 0)) // latest + 2, because wnfsWasm is latest + 1
        const changedCID = await fs.root.put()

        await expect(checkFileSystemVersion(depot, configuration, changedCID)).rejects.toBeDefined()
    })

    it("throws an error if the version is too low", async function () {
        const fs = await emptyFilesystem()
        await fs.write(Path.file("public", "some", "file.txt"), content)
        await fs.root.setVersion(Versions.encode(Versions.latest.major - 1, 0, 0))
        const changedCID = await fs.root.put()

        await expect(checkFileSystemVersion(depot, configuration, changedCID)).rejects.toBeDefined()
    })

})
