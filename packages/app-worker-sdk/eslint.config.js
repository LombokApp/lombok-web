module.exports = {
  extends: [
    '../../../../.eslintrc.js',
    '../../../../eslint-config/jest',
    '../../../../eslint-config/strict',
  ],
  ignores: ['dist'],
  parserOptions: {
    project: './tsconfig.json',
  },
}
