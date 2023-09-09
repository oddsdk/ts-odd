import { promises as fs } from "fs"

import pkg from "../package.json" assert { type: "json" }

const version = pkg.version

let versionModule = ""
versionModule += `export const VERSION = ${JSON.stringify(version, null, 4)}\n`

await fs.writeFile("src/common/version.ts", versionModule, { encoding: "utf-8" })
