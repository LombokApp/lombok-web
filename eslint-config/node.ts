import tseslint from 'typescript-eslint'
import type { ConfigArray } from 'typescript-eslint'
import globals from 'globals'

const conf: ConfigArray = tseslint.config({
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
})

export default conf
