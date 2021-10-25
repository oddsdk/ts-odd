import expect from "expect"

import * as path from "../../src/path.js"
import * as version from "../../src/fs/version.js"
import { checkVersion } from "../../src/filesystem.js"

import { emptyFilesystem } from "../helpers/filesystem.js"


describe("the filesystem versioning system", () => {

    it("throws an error if the version doesn't match", async function() {
        const fs = await emptyFilesystem()
        await fs.write(path.file("public", "some", "file.txt"), "Hello, World!")
        await fs.root.setVersion(version.encode(2, 0, 0))
        const changedCID = await fs.root.put()

        await expect(checkVersion(changedCID)).rejects.toBeDefined()
    })

})
