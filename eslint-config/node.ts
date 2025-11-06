import globals from 'globals'

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },

    rules: {
      'node/no-missing-import': 'off',
      'node/no-unpublished-import': 'off',
      'no-process-exit': 'off',
      'node/no-missing-require': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-unsupported-features/node-builtins': 'off',
    },
  },
]
