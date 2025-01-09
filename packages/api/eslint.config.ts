// import js from '@eslint/js'
import baseConfig from '../../eslint.config.js'
import nodeConfig from '../../eslint-config/node.js'
import strictConfig from '../../eslint-config/strict.js'

export default [
  baseConfig,
  nodeConfig,
  strictConfig,
  {
    parserOptions: {
      project: './tsconfig.json',
    },
    ignores: ['dist', 'src/nestjs-metadata.ts'],
    overrides: [
      // {
      //   files: '*.dto.ts',
      //   rules: {
      //     '@typescript-eslint/no-redeclare': 'off',
      //   },
      // },
      // {
      //   files: '**/migrations/Migration[0-9]*.ts',
      //   rules: {
      //     '@typescript-eslint/require-await': 'off',
      //   },
      // },
      // {
      //   files: '**/*.controller.ts',
      //   rules: {
      //     '@typescript-eslint/no-unsafe-return': 'off',
      //   },
      // },
      // {
      //   files: ['./test/**/*', '**/*.test.ts'],
      //   rules: {
      //     '@typescript-eslint/no-unsafe-assignment': 'off',
      //     '@typescript-eslint/no-unsafe-member-access': 'off',
      //     '@typescript-eslint/restrict-template-expressions': 'off',
      //     '@typescript-eslint/no-unsafe-call': 'off',
      //     '@typescript-eslint/no-unsafe-return': 'off',
      //     '@typescript-eslint/no-unsafe-argument': 'off',
      //   },
      // },
    ],
  },
]
