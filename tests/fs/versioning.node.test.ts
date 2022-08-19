import expect from "expect"

import * as path from "../../src/path.js"
import * as versions from "../../src/fs/versions.js"
import { checkFileSystemVersion } from "../../src/filesystem.js"

import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem versioning system", () => {

    it("throws an error if the version is too high", async function() {
        const fs = await emptyFilesystem()
        await fs.write(path.file("public", "some", "file.txt"), "Hello, World!")
        await fs.root.setVersion(versions.encode(versions.latest.major + 2, 0, 0)) // latest + 2, because wnfsWasm is latest + 1
        const changedCID = await fs.root.put()

        await expect(checkFileSystemVersion(changedCID)).rejects.toBeDefined()
    })

    it("throws an error if the version is too low", async function() {
        const fs = await emptyFilesystem()
        await fs.write(path.file("public", "some", "file.txt"), "Hello, World!")
        await fs.root.setVersion(versions.encode(versions.latest.major - 1, 0, 0))
        const changedCID = await fs.root.put()

        await expect(checkFileSystemVersion(changedCID)).rejects.toBeDefined()
    })

})
