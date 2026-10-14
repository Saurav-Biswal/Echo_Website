import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'], extends: [js.configs.recommended, ...tseslint.configs.recommended] },
  { files: ['tests/**/*.mjs'], languageOptions: { globals: { URL: 'readonly' } } },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'node_modules/**', '.npm-cache/**', 'next-env.d.ts']),
]);
