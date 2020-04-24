module.exports = { // eslint-disable-line
  preset: './jest-preset.js',
  transform: {
    ".(ts|tsx)": "ts-jest"
  },
  globalSetup: "jest-environment-puppeteer/setup",
  globalTeardown: "jest-environment-puppeteer/teardown",
  testEnvironment: "jest-environment-puppeteer",
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js"
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/test/",
    "/src/" // remove later
  ],
  coverageThreshold: { // bump up later
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  collectCoverageFrom: [
    "src/**/*.{js,ts}"
  ]
}
