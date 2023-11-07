import 'source-map-support/register'

import type { Config } from '@jest/types'

import config from './jest.config'

export default {
  ...config,
  setupFilesAfterEnv: ['<rootDir>/test/setup/integration-setup.ts'],
  testMatch: ['**/?(*.)integration.test.ts'],
} as Config.ConfigGlobals
