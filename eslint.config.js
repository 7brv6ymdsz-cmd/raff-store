import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['vendor/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'reports/**'] },
  js.configs.recommended,
  {
    files: ['*.js', 'admin/*.js'],
    ignores: ['eslint.config.js', 'playwright.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser, THREE: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  {
    files: ['supabase/functions/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { crypto: 'readonly', TextEncoder: 'readonly' } },
  },
  {
    files: ['tests/**/*.{js,mjs}', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true, caughtErrors: 'none' }] },
  },
];
