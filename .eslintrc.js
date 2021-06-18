module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'eslint-plugin-import',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/member-delimiter-style': ['error', {
      "multiline": {
        "delimiter": "none",
        "requireLast": false
      },
    }],
    "@typescript-eslint/no-use-before-define": ["off"],
    "@typescript-eslint/semi": ["error", "never"],
    "@typescript-eslint/ban-ts-comment": 1, // 1 = warning
    // We need to enforce .js file extensions for correct javascript output
    "import/extensions": ["error", "ignorePackages"]
  },
  "ignorePatterns": ["lib/", "dist/"],
}
