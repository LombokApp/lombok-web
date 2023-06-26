module.exports = {
  extends: [
    '../../../../eslint-config/react',
    '../../../../eslint-config/strict',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  overrides: [
    {
      files: ['./test/**/*', '**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
      },
    },
  ],
}
