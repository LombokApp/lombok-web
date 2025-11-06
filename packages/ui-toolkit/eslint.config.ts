import '../../eslint-config/eslint-plugins.d.ts'

import eslint from '@eslint/js'
import containerQueries from '@tailwindcss/container-queries'
import eslintStorybook from 'eslint-plugin-storybook'
import eslintTailwind from 'eslint-plugin-tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint-config/base'
import reactConfig from '../../eslint-config/react'
import strictConfig from '../../eslint-config/strict'
import { themePlugin } from './styles'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.recommendedTypeChecked,
  ...eslintTailwind.configs['flat/recommended'],
  baseConfig,
  reactConfig,
  strictConfig,
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
      tailwind: eslintTailwind,
    },
    settings: {
      tailwindcss: {
        config: {
          darkMode: ['[data-mode="dark"]'],
          plugins: [animatePlugin, containerQueries, themePlugin],
        },
      },
    },
    languageOptions: {
      ecmaVersion: 2022,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true,
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
)
