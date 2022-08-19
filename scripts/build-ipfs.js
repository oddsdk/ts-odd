import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill"
import esbuild from "esbuild"


const OUTFILE = "src/vendor/ipfs.js"


console.log("📦 Bundling ipfs-core")

await esbuild.build({
    entryPoints: ["node_modules/ipfs-core/src/index.js"],
    outfile: OUTFILE,
    bundle: true,
    minify: false,
    sourcemap: true,
    platform: "browser",
    format: "esm",
    target: "es2020",
    external: [
        "electron-fetch"
    ],
    plugins: [
        NodeGlobalsPolyfillPlugin()
    ],
    define: {
        "global": "globalThis",
        "globalThis.process.env.NODE_ENV": "production"
    }
})

console.log(`📝 Bundled ipfs-core into ${OUTFILE} and ${OUTFILE}.map`)
