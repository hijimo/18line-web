import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

const sourceFiles = ['src/**/*.{ts,tsx}'];

const tsRecommendedRules = tsPlugin.configs['flat/recommended'].reduce(
  (rules, config) => ({ ...rules, ...config.rules }),
  {},
);

export default [
  {
    ignores: [
      'dist/**',
      'public/**',
      'node_modules/**',
      'coverage/**',
      'storybook-static/**',
      'e2e/**',
      'src/stories/**',
      'src/theme/**',
      'src/vite-env.d.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.example.ts',
      '**/*.example.tsx',
      '**/*.stories.ts',
      '**/*.stories.tsx',
      '**/*.md',
      '**/*.log',
      '**/request.ts',
      'src/pages/accounts/components/**',
      'src/components/DataSelect/ERPShopSelect/index.tsx',
      'src/components/DataSelect/PlatSelect/index.tsx',
      'src/pages/accounts/components/Drawer/AccountBatchImportDrawer/useErpShop.ts',
      'src/pages/accounts/components/Drawer/AccountBatchImportDrawer/index.tsx',
    ],
  },
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
        sourceType: 'module',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      'jsx-a11y': jsxA11yPlugin,
      prettier: prettierPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    settings: {
      react: { version: '18.3' },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsRecommendedRules,
      ...jsxA11yPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variableLike',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          filter: {
            regex: '^[A-Z]',
            match: true,
          },
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-throw-literal': 'off',

      'class-methods-use-this': 'off',
      'import/extensions': 'off',
      'import/no-default-export': 'off',
      'import/no-named-as-default': 'off',
      'import/prefer-default-export': 'off',
      'jsx-a11y/alt-text': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-param-reassign': 'off',
      'no-restricted-exports': 'off',
      'no-underscore-dangle': 'off',
      'react/function-component-definition': ['error', { namedComponents: 'arrow-function' }],
      'react/jsx-props-no-spreading': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
];
