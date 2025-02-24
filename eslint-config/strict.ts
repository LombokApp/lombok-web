import tseslint from 'typescript-eslint'
import type { ConfigArray } from 'typescript-eslint'

export default tseslint.config({
  files: ['*.ts', '*.tsx'],
  rules: {
    // '@typescript-eslint/no-implicit-any': 'warn',
    // '@typescript-eslint/no-unsafe-argument': 'warn',
    // '@typescript-eslint/no-unsafe-assignment': 'warn',
    // '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    // '@typescript-eslint/restrict-template-expressions': 'warn',
    // '@typescript-eslint/strict-boolean-expressions': 'warn',
  },
}) as ConfigArray
