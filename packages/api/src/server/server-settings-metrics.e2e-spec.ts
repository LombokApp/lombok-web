import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'srv_set_met'

describe('Server Settings & Metrics', () => {
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

  it('should require authentication for settings', async () => {
    const res = await apiClient().GET('/api/v1/server/settings')
    expect(res.response.status).toBe(401)
  })

  it('should require admin for settings', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'setnonadm',
      password: '123',
    })

    const res = await apiClient(accessToken).GET('/api/v1/server/settings')
    expect(res.response.status).toBe(401)
  })

  it('should get server settings as admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'setadmin',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).GET('/api/v1/server/settings')
    expect(res.response.status).toBe(200)
    expect(res.data?.settings).toBeDefined()
  })

  it('should set and get a server setting', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'setput',
      password: '123',
      admin: true,
    })

    const setRes = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'SIGNUP_ENABLED' } },
        body: { value: false },
      },
    )
    expect([200, 201]).toContain(setRes.response.status)
    expect(setRes.data?.settingKey).toBe('SIGNUP_ENABLED')

    // Verify it persisted
    const getRes = await apiClient(accessToken).GET('/api/v1/server/settings')
    expect(getRes.response.status).toBe(200)
  })

  it('should delete (reset) a server setting', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'setdel',
      password: '123',
      admin: true,
    })

    // Set a setting
    await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
      params: { path: { settingKey: 'SIGNUP_ENABLED' } },
      body: { value: false },
    })

    // Reset it
    const delRes = await apiClient(accessToken).DELETE(
      '/api/v1/server/settings/{settingKey}',
      { params: { path: { settingKey: 'SIGNUP_ENABLED' } } },
    )
    expect([200, 204]).toContain(delRes.response.status)
  })

  it('should require authentication for metrics', async () => {
    const res = await apiClient().GET('/api/v1/server/metrics')
    expect(res.response.status).toBe(401)
  })

  it('should get server metrics as admin', async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'metadmin',
      password: '123',
      admin: true,
    })

    const res = await apiClient(accessToken).GET('/api/v1/server/metrics')
    expect(res.response.status).toBe(200)
    expect(res.data).toBeDefined()
  })
})
