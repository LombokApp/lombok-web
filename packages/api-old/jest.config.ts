import 'source-map-support/register'

import type { Config } from '@jest/types'

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['src', 'test'],
} as Config.InitialOptions
