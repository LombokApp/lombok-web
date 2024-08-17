import path from 'path'

export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testRegex: '.e2e-spec.ts$',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  globalSetup: path.join(__dirname, './jest-e2e.setup.ts'),
  transform: {
    '^.+\\.ts?$': 'ts-jest', // for the app source code
    '^.+\\.js?$': 'babel-jest', // for the mime package
  },
  transformIgnorePatterns: [
    path.join(__dirname, '../../../node_modules/(?!mime)'), // ignore all the node_modules directory except for node_modules/mime* paths
  ],
}
