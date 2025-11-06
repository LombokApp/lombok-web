import '../../eslint-config/eslint-plugins.d.ts'

import eslintTailwind from 'eslint-plugin-tailwindcss'
import type { ConfigArray } from 'typescript-eslint'
import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint-config/base'
import reactConfig from '../../eslint-config/react'
import strictConfig from '../../eslint-config/strict'

export default [
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.recommendedTypeChecked,
  ...eslintTailwind.configs['flat/recommended'],
  ...baseConfig,
  ...reactConfig,
  ...strictConfig,
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'public/', 'fonts/'],
  },
  {
    plugins: {
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
        tsconfigRootDir: __dirname,
        projectService: true,
        project: ['./tsconfig.eslint.json'],
      },
    },
  },
  {
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
] as ConfigArray
