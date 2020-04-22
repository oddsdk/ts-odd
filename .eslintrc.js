module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
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
    "@typescript-eslint/no-use-before-define": ["off"]
  }
};
