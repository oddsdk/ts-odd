module.exports = {
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', 'test'],
  collectCoverageFrom: ['src/**/*.{js,ts}'],

  moduleFileExtensions: ['js', 'ts'],

  testEnvironment: "jsdom",
  testPathIgnorePatterns: ['/node_modules/'],
  testRegex: '(/test/.*|\\.(test|spec))\\.(ts|tsx|js)$'
}
