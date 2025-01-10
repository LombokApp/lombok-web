import path from 'path'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintStorybook from 'eslint-plugin-storybook'
import eslintTailwind from 'eslint-plugin-tailwindcss'
import baseConfig from '../../eslint-config/base.mjs'
import reactConfig from '../../eslint-config/react.mjs'
import strictConfig from '../../eslint-config/strict.mjs'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.recommendedTypeChecked,
  // Tailwind
  ...eslintTailwind.configs['flat/recommended'],
  baseConfig,
  reactConfig,
  strictConfig,
  {
    ignores: ['.next', 'public', 'eslint.config.mjs'],
  },
  {
    plugins: {
      storybook: eslintStorybook,
      tailwind: eslintTailwind,
    },
    settings: {
      tailwindcss: {
        config: 'tailwind.config.js',
        callees: ['classnames', 'clsx', 'ctl', 'cn', 'cva'],
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
