import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill"
import esbuild from "esbuild"
import fs from "fs"
import { globby } from "globby"
import zlib from "zlib"

const globalName = "oddjs"

console.log("📦 Bundling & minifying...")

await esbuild.build({
  entryPoints: ["src/index.ts", "src/compositions/fission.ts"],
  outdir: "dist",
  bundle: true,
  splitting: true,
  minify: true,
  sourcemap: true,
  platform: "browser",
  format: "esm",
  target: "es2021",
  globalName,
  define: {
    "global": "globalThis",
    "globalThis.process.env.NODE_ENV": "production",
  },
  plugins: [
    NodeGlobalsPolyfillPlugin({
      buffer: true,
    }),
  ],
})

fs.renameSync("dist/index.js", "dist/index.esm.min.js")
fs.renameSync("dist/index.js.map", "dist/index.esm.min.js.map")
fs.renameSync("dist/compositions/fission.js", "dist/compositions/fission.esm.min.js")
fs.renameSync("dist/compositions/fission.js.map", "dist/compositions/fission.esm.min.js.map")

// UMD

const UMD = {
  banner: `(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.${globalName} = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {  `,
  footer: `return ${globalName};
}));`,
}

await esbuild.build({
  entryPoints: ["src/index.ts", "src/compositions/fission.ts"],
  outdir: "dist/umd/",
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: "browser",
  format: "iife",
  target: "es2020",
  globalName,
  define: {
    "global": "globalThis",
    "globalThis.process.env.NODE_ENV": "production",
  },
  plugins: [
    NodeGlobalsPolyfillPlugin({
      buffer: true,
    }),
  ],
  banner: { js: UMD.banner },
  footer: { js: UMD.footer },
})

fs.renameSync("dist/umd/index.js", "dist/umd/index.umd.min.js")
fs.renameSync("dist/umd/index.js.map", "dist/umd/index.umd.min.js.map")
fs.renameSync("dist/umd/compositions/fission.js", "dist/umd/compositions/fission.umd.min.js")
fs.renameSync("dist/umd/compositions/fission.js.map", "dist/umd/compositions/fission.umd.min.js.map")

// GZIP

const glob = await globby("dist/**/*.js")

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
