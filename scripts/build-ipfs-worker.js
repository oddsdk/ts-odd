import esbuild from "esbuild"

console.log("📦 bundling ipfs and ipfs worker...")

const workerOutfile = "lib/workers/ipfs.worker.js"
const ipfsOutfile = "lib/workers/ipfs.min.js"

esbuild.buildSync({
  entryPoints: ["src/workers/ipfs.worker.js"],
  outfile: workerOutfile,
  bundle: true,
  target: "es2020"
})

esbuild.buildSync({
  entryPoints: ["src/workers/ipfs.min.js"],
  outfile: ipfsOutfile,
  bundle: false,
  minify: true,
  target: "es2020"
})

console.log(`📝 Wrote ${workerOutfile} and ${ipfsOutfile}`)