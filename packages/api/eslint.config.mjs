import tseslint from 'typescript-eslint'
import eslintTs from '@typescript-eslint/eslint-plugin'
import baseConfig from '../../eslint.config.mjs'
import nodeConfig from '../../eslint-config/node.mjs'
import strictConfig from '../../eslint-config/strict.mjs'

export default tseslint.config(
  tseslint.configs.recommendedTypeChecked,
  baseConfig,
  nodeConfig,
  strictConfig,
  {
    ignores: ['dist/*', 'src/nestjs-metadata.ts', 'eslint.config.mjs'],
  },
  {
    plugins: {
      '@typescript-eslint': eslintTs,
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
