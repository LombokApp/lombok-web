const path = require('path')

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testRegex: '.e2e-spec.ts$',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts?$': 'ts-jest', // for the app source code
    '^.+\\.js?$': 'babel-jest', // for the mime package
  },
  // the mime package annoyingly went to ESM only, so we have to transform it with babel
  transformIgnorePatterns: [
    path.join(__dirname, '../../../node_modules/(?!mime)'), // ignore all the node_modules directory except for node_modules/mime* paths
  ],
}
