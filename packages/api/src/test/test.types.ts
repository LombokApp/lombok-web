import type { buildTestModule } from 'src/test/test.util'

import type { buildSupertestApiClient } from './test-api-client'

export type TestModule = Awaited<ReturnType<typeof buildTestModule>>

export type TestApiClient = ReturnType<typeof buildSupertestApiClient>
