import tseslint from 'typescript-eslint'
import eslintTs from '@typescript-eslint/eslint-plugin'
import eslintStorybook from 'eslint-plugin-storybook'
import baseConfig from '../../eslint.config.mjs'
import reactConfig from '../../eslint-config/react.mjs'
import strictConfig from '../../eslint-config/strict.mjs'

export default tseslint.config(
  tseslint.configs.recommendedTypeChecked,
  baseConfig,
  reactConfig,
  strictConfig,
  {
    ignores: ['.next', 'public', 'eslint.config.mjs'],
  },
  {
    plugins: {
      '@typescript-eslint': eslintTs,
      storybook: eslintStorybook,
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
