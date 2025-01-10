import path from 'path'
import eslint from '@eslint/js'
import eslintStorybook from 'eslint-plugin-storybook'
import eslintTailwind from 'eslint-plugin-tailwindcss'
import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint-config/base.mjs'
import reactConfig from '../../eslint-config/react.mjs'
import strictConfig from '../../eslint-config/strict.mjs'

export default tseslint.config(
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
      'tailwind.config.js',
      'plop-templates/`',
      'eslint.config.mjs',
      'plopfile.mjs'
    ],
  },
  {
    plugins: {
      storybook: eslintStorybook,
      tailwind: eslintTailwind,
    },
    settings: {
      tailwindcss: {
        config: 'tailwind.config.js',
        // callees: ['classnames', 'clsx', 'ctl', 'cn', 'cva'],
        // config: path.join(import.meta.dirname, "./tailwind.config.js"),
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
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.recommendedTypeChecked,

  // Tailwind
  ...eslintTailwind.configs['flat/recommended'],
  {
    rules: {
      eqeqeq: 'error',
      yoda: 'error',
      curly: 'error',
      semi: ['error', 'never'],
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
