import '../../eslint-config/eslint-plugins.d.ts'

import eslint from '@eslint/js'
import type { ConfigArray } from 'typescript-eslint'
import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint-config/base'
import nodeConfig from '../../eslint-config/node'
import strictConfig from '../../eslint-config/strict'

const conf: ConfigArray = tseslint.config(
  baseConfig,
  nodeConfig,
  strictConfig,
  {
    ignores: ['dist/*'],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      parserOptions: {
        tsconfigRootDir: __dirname,
        projectService: true,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.recommendedTypeChecked,
)

export default conf
