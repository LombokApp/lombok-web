import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.storybook/',
      'tailwind.config.js',
      'plop-templates/`',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    rules: {
      eqeqeq: 'error',
      yoda: 'error',
      curly: 'error',
      semi: ['error', 'never'],
      'no-else-return': 'error',
      'react/prop-types': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-undef-init': 'error',
      'no-lonely-if': 'error',
      'no-unneeded-ternary': 'error',
      'no-confusing-arrow': 'error',
      'no-extra-semi': 'error',
      'dot-notation': 'error',
    },
  },
)
