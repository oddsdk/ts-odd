module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: `./tsconfig.eslint.json`
  },
  plugins: [
    "@typescript-eslint",
    "import"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/typescript",
  ],
  rules: {
    // We force all non-package imports (i.e. relative imports like "./spiralratchet.js")
    // to contain file extensions, e.g. ".js", because many tools will need these extensions
    // to resolve javascript files. In other words: Because extensionless imports aren't
    // supported in all environments.
    "import/extensions": ["error", "ignorePackages"],
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
