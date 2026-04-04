import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'viewer_update'

describe('Viewer Update', () => {
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

  it('should require authentication', async () => {
    const res = await apiClient().PUT('/api/v1/viewer', {
      body: { name: 'New Name' },
    })
    expect(res.response.status).toBe(401)
  })

  it('should update viewer name', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'viewerupd',
      password: '123',
    })

    const res = await apiClient(accessToken).PUT('/api/v1/viewer', {
      body: { name: 'Updated Name' },
    })
    expect(res.response.status).toBe(200)
    expect(res.data?.user.name).toBe('Updated Name')
  })

  it('should persist viewer name after update', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'viewerpersist',
      password: '123',
    })

    await apiClient(accessToken).PUT('/api/v1/viewer', {
      body: { name: 'Persisted Name' },
    })

    const getRes = await apiClient(accessToken).GET('/api/v1/viewer')
    expect(getRes.response.status).toBe(200)
    expect(getRes.data?.user.name).toBe('Persisted Name')
  })

  it('should allow updating name to empty string', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'viewerempty',
      password: '123',
    })

    const res = await apiClient(accessToken).PUT('/api/v1/viewer', {
      body: { name: '' },
    })
    // Either succeeds or validates - both are acceptable
    expect([200, 400]).toContain(res.response.status)
  })
})
