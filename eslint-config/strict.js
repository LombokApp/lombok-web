module.exports = {
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      // plugins: ['@typescript-eslint'],
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
    },
  ],
}
