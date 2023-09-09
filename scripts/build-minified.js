import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill"
import esbuild from "esbuild"
import { wasmLoader } from "esbuild-plugin-wasm"
import fs from "fs"
import { globby } from "globby"
import zlib from "zlib"

// CONFIG

const globalName = "oddjs"

const CONFIG = {
  entryPoints: ["src/index.ts", "src/compositions/local.ts"],
  outdir: "dist",
  bundle: true,
  splitting: true,
  minify: true,
  sourcemap: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  globalName,
  define: {
    "global": "globalThis",
    "globalThis.process.env.NODE_ENV": "production",
  },
  plugins: [
    NodeGlobalsPolyfillPlugin({
      buffer: true,
    }),
    wasmLoader(),
  ],
}

// REGULAR BUILD

console.log("📦 Bundling & minifying...")

await esbuild.build(CONFIG)

fs.renameSync("dist/index.js", "dist/index.esm.min.js")
fs.renameSync("dist/index.js.map", "dist/index.esm.min.js.map")
fs.renameSync("dist/compositions/local.js", "dist/compositions/local.esm.min.js")
fs.renameSync("dist/compositions/local.js.map", "dist/compositions/local.esm.min.js.map")

// GZIP

const glob = await globby("dist/**/*.(js|wasm)")

glob.forEach(jsFile => {
  const outfile = jsFile
  const outfileGz = `${outfile}.gz`

  console.log(`📝 Wrote ${outfile} and ${outfile}.map`)
  console.log("💎 Compressing into .gz")
  const fileContents = fs.createReadStream(outfile)
  const writeStream = fs.createWriteStream(outfileGz)
  const gzip = zlib.createGzip()

  fileContents.pipe(gzip).pipe(writeStream)

  console.log(`📝 Wrote ${outfileGz}`)
})
