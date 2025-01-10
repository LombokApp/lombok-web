import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import baseConfig from '../../eslint-config/base.mjs'
import nodeConfig from '../../eslint-config/node.mjs'
import strictConfig from '../../eslint-config/strict.mjs'

export default tseslint.config(
  baseConfig,
  nodeConfig,
  strictConfig,
  {
    ignores: ['dist/*', 'src/nestjs-metadata.ts', 'eslint.config.mjs'],
  },
  {
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
)
