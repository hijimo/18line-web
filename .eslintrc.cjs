/* eslint-env node */

module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-refresh', 'import', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended',
    'plugin:import/typescript',
    'plugin:storybook/recommended',
  ],
  parserOptions: {
    project: './tsconfig.json', // airbnb-typescript 需要
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  settings: {
    react: { version: 'detect' },
  },
  // 只检查 src 目录下的文件
  ignorePatterns: [
    '!src/**/*',
    'dist/**/*',
    'node_modules/**/*',
    'coverage/**/*',
    'storybook-static/**/*',
    'e2e/**/*',
    'src/stories/**/*',
    'src/theme/**/*',
    'vite-env.d.ts',
    '*.config.*',
    '*.cjs',
    '*.js',
    '*.json',
    '*.test.tsx',
    '*.test.ts',
    '*.spec.ts',
    '*.spec.tsx',
    '*.example.tsx',
    'example.tsx',
    '*.example.ts',
    '*.stories.tsx',
    '*.stories.ts',
    '*.md',
    '*.log',
    'request.ts',
    // 忽略测试代码
    'pages/accounts/components/**/*',
    'components/DataSelect/ERPShopSelect/index.tsx',
    'components/DataSelect/PlatSelect/index.tsx',
    'components/DataSelect/PlatSelect/index.tsx',
    'src/pages/accounts/components/Drawer/AccountBatchImportDrawer/useErpShop.ts',
    'src/pages/accounts/components/Drawer/AccountBatchImportDrawer/index.tsx',

    // 测试end
  ],
  rules: {
    // React Refresh 规则（保留原有）
    'react-refresh/only-export-components': 'warn',
    'react/react-in-jsx-scope': 'off',

    // TypeScript 命名规范
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variableLike',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        filter: {
          // 允许 React 组件使用 PascalCase
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

    // 与 Google TS Style Guide 关键点对齐（在 Airbnb 之上调优）
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    'import/no-default-export': 'warn', // Google 倾向命名导出，可根据项目情况改为 'error'
    'react/function-component-definition': ['error', { namedComponents: 'arrow-function' }],
    'react/jsx-props-no-spreading': 'off', // 视项目实际需要
    'import/extensions': 'off', // 关闭文件扩展名检查
    'react/require-default-props': 'off',
    'prettier/prettier': 'error',
    'no-restricted-exports': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'import/prefer-default-export': 'off',
    'react/prop-types': 'off',
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: ['draft'], // 忽略 Immer 的 draft
      },
    ],
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-underscore-dangle': 'off',
    'class-methods-use-this': 'off',
    'no-underscore-dangle': 'off',
    'no-param-reassign': 'off',
    '@typescript-eslint/no-throw-literal': 'off',
    'import/no-default-export': 'off',
    'react-refresh/only-export-components': 'off',
    'import/no-named-as-default': 'off',
    /** 关闭a11y */
    'jsx-a11y/alt-text': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    /** 关闭a11y */
  },
  overrides: [
    {
      files: ['*.cjs'],
      env: { node: true },
      parserOptions: { sourceType: 'script' },
    },

    // React 组件允许默认导出
    {
      files: ['**/*.tsx', '**/pages/**/*.ts', '**/App.tsx'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],
};
