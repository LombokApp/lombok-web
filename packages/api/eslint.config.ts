import '../../eslint-config/eslint-plugins.d.ts'

import type { ConfigArray } from 'typescript-eslint'
import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint-config/base'
import nodeConfig from '../../eslint-config/node'
import strictConfig from '../../eslint-config/strict'

export default [
  ...baseConfig,
  ...nodeConfig,
  ...strictConfig,
  {
    ignores: ['dist/*', 'src/nestjs-metadata.ts'],
  },
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
      },
    },
  },
  {
    files: [
      'src/**/*.e2e-spec.ts',
      'src/**/*.test.ts',
      'test/**/*.ui-e2e-spec.ts',
      'src/docker/tests/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  { ignores: ['nginx/*.js'] },
] as ConfigArray
