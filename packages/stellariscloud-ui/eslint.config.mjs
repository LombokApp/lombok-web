import tseslint from 'typescript-eslint'
import eslintStorybook from 'eslint-plugin-storybook'
import eslintTailwind from 'eslint-plugin-tailwindcss'
import baseConfig from '../../eslint-config/base.mjs'
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
      storybook: eslintStorybook,
      tailwind: eslintTailwind,
    },
    languageOptions: {
      ecmaVersion: 2022,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true,
      },
    },
  },
  // Tailwind
  ...eslintTailwind.configs['flat/recommended'],
)
