import eslint from '@eslint/js'
import eslintStorybook from 'eslint-plugin-storybook'
import eslintTailwind from 'eslint-plugin-tailwindcss'
import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint-config/base'
import reactConfig from '../../eslint-config/react'
import strictConfig from '../../eslint-config/strict'

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
      '.next/',
      'public/',
      'fonts/',
    ],
  },
  {
    plugins: {
      storybook: eslintStorybook,
      tailwind: eslintTailwind,
    },
    settings: {
      tailwindcss: {
        config: 'tailwind.config.ts',
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
)
