module.exports = {
  settings: {
    jest: {
      version: 'detect',
    },
  },

  overrides: [
    {
      files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
      extends: ['plugin:jest/recommended', 'plugin:jest/style'],
    },
  ],
};
