import { promises as fs } from "fs"

import pkg from "../package.json" assert { type: "json" };
import lock from "../package-lock.json" assert { type: "json" };


const version = pkg.version
const wnfsVersionBound = pkg.dependencies.wnfs

if (wnfsVersionBound == null) {
    throw new Error(`Expected 'wnfs' in dependencies, but not found`)
}

const resolvedWasmWnfsVersion = lock.packages[ "node_modules/wnfs" ].version

if (resolvedWasmWnfsVersion == null) {
    throw new Error(`Couldn't find resolved wnfs version in package-lock.json file`)
}

let versionModule = ""
versionModule += `export const VERSION = ${JSON.stringify(version, null, 4)}\n`
versionModule += `export const WASM_WNFS_VERSION = ${JSON.stringify(resolvedWasmWnfsVersion, null, 4)}\n`

await fs.writeFile("src/common/version.ts", versionModule, { encoding: "utf-8" })