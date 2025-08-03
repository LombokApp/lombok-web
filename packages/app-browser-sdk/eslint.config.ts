import eslint from '@eslint/js'
import eslintTailwind from 'eslint-plugin-tailwindcss'
import tseslint, { type Config } from 'typescript-eslint'

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
      },
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs'],
        },
        tsconfigRootDir: __dirname,
      },
    },
  },
) as Config
