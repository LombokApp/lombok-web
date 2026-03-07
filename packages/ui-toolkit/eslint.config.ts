import '../../eslint-config/eslint-plugins.d.ts'

import eslintStorybook from 'eslint-plugin-storybook'
import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint-config/base'
import reactConfig from '../../eslint-config/react'
import strictConfig from '../../eslint-config/strict'

export default [
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.recommendedTypeChecked,
  ...baseConfig,
  ...reactConfig,
  ...strictConfig,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.storybook/',
      '.github/',
      'storybook-static/',
    ],
  },
  {
    plugins: {
      storybook: eslintStorybook,
    },
    languageOptions: {
      globals: {
        React: 'readonly',
        JSX: 'readonly',
      },
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
      },
    },
  },
  {
    rules: {
      eqeqeq: 'error',
      yoda: 'error',
      curly: 'error',
      'no-else-return': 'error',
      'react/prop-types': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-undef-init': 'error',
      'no-lonely-if': 'error',
      'no-unneeded-ternary': 'error',
      'no-confusing-arrow': 'error',
      'no-extra-semi': 'error',
      'dot-notation': 'error',
    },
  },
]
