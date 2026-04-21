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
    appIdentifier = DUMMY_APP_SLUG

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
      const patchRes = await apiClient(accessToken).PATCH(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { api_key: 'sk-test-123', theme: 'dark' } },
        },
      )
      expect(patchRes.response.status).toBe(200)
      expect(patchRes.data?.settings.values.api_key).toBe('********') // masked on GET
      expect(patchRes.data?.settings.values.theme).toBe('dark')
      expect(patchRes.data?.settings.sources.api_key).toBe('user')
      expect(patchRes.data?.settings.sources.theme).toBe('user')
    })

    it('should preserve untouched secrets across patches', async () => {
      // Store initial secret
      await apiClient(accessToken).PATCH(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { api_key: 'sk-real-key' } },
        },
      )

      // Patch an unrelated key — secret is simply not in the body
      await apiClient(accessToken).PATCH(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { theme: 'dark' } },
        },
      )

      // Secret preserved (still present, masked on GET)
      const getRes = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        { params: { path: { appIdentifier } } },
      )
      expect(getRes.data?.settings.values.api_key).toBe('********')
      expect(getRes.data?.settings.sources.api_key).toBe('user')
      expect(getRes.data?.settings.values.theme).toBe('dark')
    })

    it('should merge patches (omitted keys preserved)', async () => {
      await apiClient(accessToken).PATCH(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { theme: 'dark', max_retries: 5 } },
        },
      )

      // Update only one key
      await apiClient(accessToken).PATCH(
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

    it('should delete a key when null is patched', async () => {
      await apiClient(accessToken).PATCH(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { theme: 'dark' } },
        },
      )

      await apiClient(accessToken).PATCH(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { theme: null } },
        },
      )

      const getRes = await apiClient(accessToken).GET(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        { params: { path: { appIdentifier } } },
      )
      expect(getRes.data?.settings.values.theme).toBe('light') // back to default
      expect(getRes.data?.settings.sources.theme).toBe('default')
    })

    it('should reject invalid values', async () => {
      const res = await apiClient(accessToken).PATCH(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { theme: 'blue' } }, // not in enum
        },
      )
      expect(res.response.status).toBe(400)
    })

    it('should reject keys with invalid format', async () => {
      for (const badKey of [
        'Theme', // uppercase
        '_leading',
        'trailing_',
        'has-dash',
        'has.dot',
        'has space',
      ]) {
        const res = await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: { values: { [badKey]: 'x' } },
          },
        )
        expect(res.response.status).toBe(400)
      }
    })

    it('should reject unknown keys', async () => {
      const res = await apiClient(accessToken).PATCH(
        `/api/v1/user/apps/{appIdentifier}/custom-settings`,
        {
          params: { path: { appIdentifier } },
          body: { values: { unknown_key: 'value' } },
        },
      )
      expect(res.response.status).toBe(400)
    })

    describe('pattern property keys', () => {
      it('should upsert and list arbitrary prefix-matched keys', async () => {
        await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: {
              values: {
                provider_openai: { type: 'openai', token: 'sk-o' },
                provider_anthropic: { type: 'anthropic', token: 'sk-a' },
              },
            },
          },
        )

        const getRes = await apiClient(accessToken).GET(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          { params: { path: { appIdentifier } } },
        )
        expect(getRes.data?.settings.values.provider_openai).toEqual({
          type: 'openai',
          token: 'sk-o',
        })
        expect(getRes.data?.settings.values.provider_anthropic).toEqual({
          type: 'anthropic',
          token: 'sk-a',
        })
        expect(getRes.data?.settings.sources.provider_openai).toBe('user')
        expect(getRes.data?.settings.sources.provider_anthropic).toBe('user')
      })

      it('should patch one pattern key without disturbing siblings', async () => {
        await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: {
              values: {
                provider_openai: { type: 'openai', token: 'sk-o' },
                provider_anthropic: { type: 'anthropic', token: 'sk-a' },
              },
            },
          },
        )

        // Replace only provider_openai — provider_anthropic must be untouched
        await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: {
              values: { provider_openai: { type: 'openai', token: 'sk-o2' } },
            },
          },
        )

        const getRes = await apiClient(accessToken).GET(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          { params: { path: { appIdentifier } } },
        )
        expect(getRes.data?.settings.values.provider_openai).toEqual({
          type: 'openai',
          token: 'sk-o2',
        })
        expect(getRes.data?.settings.values.provider_anthropic).toEqual({
          type: 'anthropic',
          token: 'sk-a',
        })
      })

      it('should delete a single pattern key via null', async () => {
        await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: {
              values: {
                provider_openai: { type: 'openai', token: 'sk-o' },
                provider_anthropic: { type: 'anthropic', token: 'sk-a' },
              },
            },
          },
        )

        await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: { values: { provider_openai: null } },
          },
        )

        const getRes = await apiClient(accessToken).GET(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          { params: { path: { appIdentifier } } },
        )
        expect(getRes.data?.settings.values.provider_openai).toBeUndefined()
        expect(getRes.data?.settings.sources.provider_openai).toBeUndefined()
        expect(getRes.data?.settings.values.provider_anthropic).toEqual({
          type: 'anthropic',
          token: 'sk-a',
        })
      })

      it('should reject pattern-matched values that violate the sub-schema', async () => {
        const res = await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: {
              // missing required `type`
              values: { provider_openai: { token: 'sk-o' } },
            },
          },
        )
        expect(res.response.status).toBe(400)
      })

      it('should reject keys that match no property and no pattern', async () => {
        const res = await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: {
              values: { unprefixed_provider: { type: 'openai', token: 'x' } },
            },
          },
        )
        expect(res.response.status).toBe(400)
      })

      it('should keep fixed properties and pattern keys coexisting', async () => {
        await apiClient(accessToken).PATCH(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          {
            params: { path: { appIdentifier } },
            body: {
              values: {
                theme: 'dark',
                provider_openai: { type: 'openai', token: 'sk-o' },
              },
            },
          },
        )

        const getRes = await apiClient(accessToken).GET(
          `/api/v1/user/apps/{appIdentifier}/custom-settings`,
          { params: { path: { appIdentifier } } },
        )
        expect(getRes.data?.settings.values.theme).toBe('dark')
        expect(getRes.data?.settings.sources.theme).toBe('user')
        expect(getRes.data?.settings.values.max_retries).toBe(3) // still default
        expect(getRes.data?.settings.sources.max_retries).toBe('default')
        expect(getRes.data?.settings.values.provider_openai).toEqual({
          type: 'openai',
          token: 'sk-o',
        })
      })
    })

    it('should DELETE and revert to defaults', async () => {
      await apiClient(accessToken).PATCH(
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
