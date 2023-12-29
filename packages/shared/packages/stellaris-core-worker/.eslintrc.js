module.exports = {
  extends: [
    '../../../../.eslintrc.js',
    '../../../../eslint-config/jest',
    '../../../../eslint-config/strict',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
}
