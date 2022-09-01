import { promises as fs } from "fs"
import lockfile from "@yarnpkg/lockfile"

fs.readFile("package.json", { encoding: "utf-8" }).then(async pkg => {
    const pkgJson = JSON.parse(pkg)
    const version = pkgJson.version
    const wnfsVersionBound = pkgJson.dependencies.wnfs

    if (wnfsVersionBound == null) {
        throw new Error(`Expected 'wnfs' in dependencies, but not found`)
    }

    const lockFileContent = await fs.readFile("yarn.lock", { encoding: "utf8" })
    const result = lockfile.parse(lockFileContent)

    if (result.type !== "success") {
        throw new Error(`Couldn't parse yarn.lock file (result type: ${result.type})`)
    }

    const lockFileJSON = result.object
    const resolvedWasmWnfsVersion = lockFileJSON[`wnfs@${wnfsVersionBound}`].version

    if (resolvedWasmWnfsVersion == null) {
        throw new Error(`Couldn't find resolved wnfs version in yarn.lock file`)
    }

    let versionModule = ""
    versionModule += `export const VERSION = ${JSON.stringify(version, null, 4)}\n`
    versionModule += `export const WASM_WNFS_VERSION = ${JSON.stringify(resolvedWasmWnfsVersion, null, 4)}\n`
    await fs.writeFile("src/common/version.ts", versionModule, { encoding: "utf-8" })
}).catch(e => {
    console.error(`There was an issue while trying to generate a "src/common/version.ts" file: ${e.message}\n${e}`)
    throw e
})
