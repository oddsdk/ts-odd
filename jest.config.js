module.exports = {
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', 'test'],
  collectCoverageFrom: ['src/**/*.{js,ts}'],

  moduleFileExtensions: ['js', 'ts'],

  preset: 'jest-puppeteer',

  testPathIgnorePatterns: ['/node_modules/'],
  testRegex: '(/tests/.*\\.test|\\.(test|spec))\\.(ts|tsx|js)$',
  testTimeout: 120000
}
