import js from '@eslint/js'
export default [
  js.configs.react,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },

    plugins: ['jsx-a11y', 'react', 'react-hooks'],

    extends: [
      'plugin:jsx-a11y/recommended',
      'plugin:react-hooks/recommended',
      'plugin:react/recommended',
      'plugin:tailwindcss/recommended',
    ],

    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
    },

    overrides: [
      {
        files: ['.jsx', '.tsx'],
        rules: {
          'sonarjs/cognitive-complexity': 'off',
        },
      },
    ],
  },
]
