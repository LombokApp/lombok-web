import 'source-map-support/register'

import config from './jest.config'

export default {
  ...config,
  globalSetup: '<rootDir>/test/setup/integration-global-setup.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup/integration-setup.ts'],
  testMatch: ['**/?(*.)integration.test.ts'],
}
