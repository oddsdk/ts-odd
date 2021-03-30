import { promises as fs } from "fs"

(async () => {
    try {
        const pkg = await fs.readFile("package.json", { encoding: "utf-8" })
        const pkgJson = JSON.parse(pkg)
        const version = pkgJson.version
        const versionModule = `export const VERSION = ${JSON.stringify(version, null, 4)}` + "\n"
        await fs.writeFile("src/common/version.ts", versionModule, { encoding: "utf-8" })
    } catch (e) {
        console.error(`There was an issue while trying to generate a "src/common/version.ts" file:`)
        throw e
    }
})()
