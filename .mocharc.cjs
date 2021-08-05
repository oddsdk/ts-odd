module.exports = {
    extension: ["ts"],
    spec: [
        "tests/**/*.test.ts",
        "tests/*.test.ts",
        "src/**/*.test.ts",
        "src/*.test.ts",
    ],
    forbidOnly: process.env.TEST_ENV == "gh-action" ? true : false,
    forbidPending: process.env.TEST_ENV == "gh-action" ? true : false,
    require: "tests/mocha-hook.ts",
    timeout: 120000,
    loader: "ts-node/esm",
}
