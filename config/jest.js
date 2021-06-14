process.env.JEST_PUPPETEER_CONFIG = require.resolve('./jest-puppeteer.js');

module.exports = {
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', 'test'],
  collectCoverageFrom: ['src/**/*.{js,ts}'],

  moduleFileExtensions: ['js', 'ts'],

  preset: 'jest-puppeteer',

  rootDir: '..',

  testPathIgnorePatterns: ['/node_modules/'],
  testRegex: '(/tests/.*\\.test|\\.(test|spec))\\.(ts|tsx|js)$',
  testTimeout: 120000,

  transform: {
    "\\.[jt]sx?$": ["babel-jest", { configFile: "./config/babel.js" }]
  },

  setupFiles: ['./src/setup/jest.ts']
}
