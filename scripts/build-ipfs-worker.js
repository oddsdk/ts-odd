import * as fs from 'fs';
import * as https from 'https';
import esbuild from "esbuild"


console.log("📦 Bundling ipfs and ipfs worker...")

const workerOutfile = "lib/workers/ipfs.worker.js"
const ipfsOutfile = "lib/workers/ipfs.min.js"

// esbuild.buildSync({
//   entryPoints: ["src/workers/ipfs.worker.js"],
//   outfile: workerOutfile,
//   bundle: true,
//   target: "es2020"
// })

console.log(`⬇️ Dowloading minified IPFS bundle`)

const file = fs.createWriteStream(ipfsOutfile);
https.get("https://unpkg.com/ipfs@0.61.0/index.min.js", function(response) {
   response.pipe(file);
   file.on("finish", () => file.close());
});

console.log(`📝 Wrote ${workerOutfile} and ${ipfsOutfile}`)