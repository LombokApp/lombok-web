import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import { DUMMY_APP_SLUG } from 'test/e2e.contants'

const TEST_MODULE_KEY = 'app_custom_settings'

describe('App Custom Settings', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient
  let appIdentifier: string
  let accessToken: string
  let adminToken: string

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
    apiClient = testModule.apiClient

    await testModule.installLocalAppBundles([DUMMY_APP_SLUG])
    appIdentifier = await testModule.getAppIdentifierBySlug(DUMMY_APP_SLUG)

    const admin = await createTestUser(testModule, {
      username: 'cs_admin',
      password: '123',
      admin: true,
    })
    adminToken = admin.session.accessToken

    await apiClient(adminToken).PUT(
      `/api/v1/server/apps/{appIdentifier}/enabled`,
      {
        params: { path: { appIdentifier } },
        body: { enabled: true },
      },
    )

    const user = await createTestUser(testModule, {
      username: 'cs_user',
      password: '123',
    })
    accessToken = user.session.accessToken
  })

  afterEach(async () => {
    // Clean up custom settings between tests by deleting them
    await apiClient(accessToken).DELETE(
      `/api/v1/user/apps/{appIdentifier}/custom-settings`,
      { params: { path: { appIdentifier } } },
    )
  })

  describe('User-level custom settings', () => {
    it('should return schema defaults when no values stored', async () => {
      const res = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        { params: { path: { appIdentifier } } },
      )
      expect(res.response.status).toBe(200)
      expect(res.data?.settings.schema).toBeDefined()
      expect(res.data?.settings.values.max_retries).toBe(3)
      expect(res.data?.settings.values.theme).toBe('light')
      expect(res.data?.settings.sources.max_retries).toBe('default')
      expect(res.data?.settings.sources.theme).toBe('default')
    })

    it('should store and return user values', async () => {
      const putRes = await apiClient(accessToken).PUT(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { api_key: 'sk-test-123', theme: 'dark' } },
        },
      )
      expect(putRes.response.status).toBe(200)
      expect(putRes.data?.settings.values.api_key).toBe('********') // masked
      expect(putRes.data?.settings.values.theme).toBe('dark')
      expect(putRes.data?.settings.sources.api_key).toBe('user')
      expect(putRes.data?.settings.sources.theme).toBe('user')
    })

    it('should preserve secrets on PUT with masked value', async () => {
      // Store initial value
      await apiClient(accessToken).PUT(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { api_key: 'sk-real-key' } },
        },
      )

      // Update with masked placeholder
      await apiClient(accessToken).PUT(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { api_key: '********', theme: 'dark' } },
        },
      )

      // Verify secret was preserved (still masked on GET)
      const getRes = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        { params: { path: { appIdentifier } } },
      )
      expect(getRes.data?.settings.values.api_key).toBe('********')
      expect(getRes.data?.settings.values.theme).toBe('dark')
    })

    it('should merge on PUT (omitted keys preserved)', async () => {
      await apiClient(accessToken).PUT(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { theme: 'dark', max_retries: 5 } },
        },
      )

      // Update only one key
      await apiClient(accessToken).PUT(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { max_retries: 10 } },
        },
      )

      const getRes = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        { params: { path: { appIdentifier } } },
      )
      expect(getRes.data?.settings.values.theme).toBe('dark') // preserved
      expect(getRes.data?.settings.values.max_retries).toBe(10) // updated
    })

    it('should reject invalid values', async () => {
      const res = await apiClient(accessToken).PUT(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { theme: 'blue' } }, // not in enum
        },
      )
      expect(res.response.status).toBe(400)
    })

    it('should reject unknown keys', async () => {
      const res = await apiClient(accessToken).PUT(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { unknown_key: 'value' } },
        },
      )
      expect(res.response.status).toBe(400)
    })

    it('should DELETE and revert to defaults', async () => {
      await apiClient(accessToken).PUT(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { theme: 'dark' } },
        },
      )

      await apiClient(accessToken).DELETE(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        { params: { path: { appIdentifier } } },
      )

      const getRes = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        { params: { path: { appIdentifier } } },
      )
      expect(getRes.data?.settings.values.theme).toBe('light') // back to default
      expect(getRes.data?.settings.sources.theme).toBe('default')
    })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
