import eslintJsxAlly from 'eslint-plugin-jsx-a11y'
import eslintReact from 'eslint-plugin-react'
import eslintReactHooks from 'eslint-plugin-react-hooks'

export default {
  settings: {
    react: {
      version: 'detect',
    },
  },

  plugins: {
    'jsx-a11y': eslintJsxAlly,
    react: eslintReact,
    'react-hooks': eslintReactHooks,
  },

  // extends: [
  //   'plugin:jsx-a11y/recommended',
  //   'plugin:react-hooks/recommended',
  //   'plugin:react/recommended',
  //   'plugin:tailwindcss/recommended',
  // ],

  rules: {
    'react-hooks/exhaustive-deps': 'error',
    'react/display-name': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',
  },
}
