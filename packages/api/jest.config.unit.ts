import config from './jest.config'

export default {
  ...config,
  setupFilesAfterEnv: ['<rootDir>/test/setup/unit-setup.ts'],
  testMatch: ['**/?(*.)test.ts', '!**/?(*.)integration.test.ts'],
}
