import esbuild from "esbuild"
import fs from "fs"
import zlib from "zlib"


const globalName = "webnative"
const outfile = "dist/index.umd.min.js"
const outfileGz = `${outfile}.gz`

// From https://github.com/umdjs/umd/blob/36fd1135ba44e758c7371e7af72295acdebce010/templates/returnExports.js
const umd = {
    banner:
`(function (root, factory) {
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
    footer:
`return ${globalName};
}));`
}

console.log("📦 bundling & minifying...")

esbuild.buildSync({
    entryPoints: ["src/index.ts"],
    outfile,
    bundle: true,
    minify: true,
    sourcemap: true,
    platform: "browser",
    format: "iife",
    target: "es2020",
    globalName,
    banner: {
        js: umd.banner,
    },
    footer: {
        js: umd.footer,
    },
})

console.log(`📝 Wrote ${outfile} and ${outfile}.map`)

console.log("💎 compressing into .gz")

const fileContents = fs.createReadStream(outfile)
const writeStream = fs.createWriteStream(outfileGz)
const gzip = zlib.createGzip()

fileContents.pipe(gzip).pipe(writeStream)

console.log(`📝 Wrote ${outfileGz}`)
