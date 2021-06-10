import * as esbuild from "esbuild"


esbuild.build({
    bundle: false,
    entryPoints: ["src/index.ts"],
    outfile: "dist/index.es5.js",
    platform: "browser",
    sourcemap: true,
    inject: ["./node_modules/buffer/index.js"],
    format: "esm",
    target: "esnext",
})
