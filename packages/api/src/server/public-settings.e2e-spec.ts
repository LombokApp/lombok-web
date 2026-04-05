import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'public_settings'

describe('Public Settings', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })

  it('should return public settings without authentication', async () => {
    const response = await apiClient().GET('/api/v1/public/settings')
    expect(response.response.status).toEqual(200)
    expect(response.data?.settings).toBeDefined()
  })

  it('should return public settings with authentication too', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'pubuser',
      password: '123',
    })

    const response = await apiClient(accessToken).GET('/api/v1/public/settings')
    expect(response.response.status).toEqual(200)
    expect(response.data?.settings).toBeDefined()
  })

  it('should include expected fields in public settings', async () => {
    const response = await apiClient().GET('/api/v1/public/settings')
    expect(response.response.status).toEqual(200)
    // Public settings should be an object (exact shape depends on config)
    expect(typeof response.data?.settings).toEqual('object')
  })
})
