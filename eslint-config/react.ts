import tseslint, { ConfigArray } from 'typescript-eslint'
import eslintJsxAlly from 'eslint-plugin-jsx-a11y'
import eslintReact from 'eslint-plugin-react'
import eslintReactHooks from 'eslint-plugin-react-hooks'
import eslintImport from 'eslint-plugin-import'

export default tseslint.config({
  settings: {
    react: {
      version: 'detect',
    },
  },

  plugins: {
    'jsx-a11y': eslintJsxAlly,
    react: eslintReact,
    'react-hooks': eslintReactHooks,
    import: eslintImport,
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
}) as ConfigArray
