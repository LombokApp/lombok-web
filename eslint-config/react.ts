import './eslint-plugins.d.ts'

import eslintJsxAlly from 'eslint-plugin-jsx-a11y'
import eslintReact from 'eslint-plugin-react'
import eslintReactHooks from 'eslint-plugin-react-hooks'
import eslintImport from 'eslint-plugin-import'
import globals from 'globals'

export default [
  {
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
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.worker,
        ...globals.serviceworker,
        ...globals.node,
      },
    },

    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
]
