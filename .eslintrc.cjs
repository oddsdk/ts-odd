module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: `./tsconfig.eslint.json`
  },
  plugins: [
    "@typescript-eslint",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "@typescript-eslint/member-delimiter-style": ["error", {
      "multiline": {
        "delimiter": "none",
        "requireLast": false
      },
    }],
    "@typescript-eslint/no-use-before-define": ["off"],
    "@typescript-eslint/semi": ["error", "never"],
    "@typescript-eslint/ban-ts-comment": 1,
    "@typescript-eslint/quotes": ["error", "double", {
      allowTemplateLiterals: true
    }],
    // If you want to *intentionally* run a promise without awaiting, prepend it with "void " instead of "await "
    "@typescript-eslint/no-floating-promises": ["error"],
  }
}
