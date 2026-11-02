// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Textes en français : les apostrophes sont partout.
    rules: { 'react/no-unescaped-entities': 'off' },
  },
]);
