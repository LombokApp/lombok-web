module.exports = {
  env: {
    node: true,
  },

  plugins: ['node'],

  extends: ['plugin:node/recommended'],

  rules: {
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    'no-process-exit': 'off',
    'node/no-missing-require': 'off',
  },

  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'node/no-unsupported-features/es-syntax': 'off',
      },
    },
  ],
};
