import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import {
  buildAppZip,
  createTestAppConfig,
} from 'src/app/tests/app-zip-builder.util'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'
import request from 'supertest'
import type { App } from 'supertest/types'

const TEST_MODULE_KEY = 'server'

const installApp = async (
  testModule: TestModule,
  accessToken: string,
  zipBuffer: Buffer,
) => {
  const installResponse = await request(testModule.app.getHttpServer() as App)
    .post('/api/v1/server/apps/install')
    .set('Authorization', `Bearer ${accessToken}`)
    .attach('file', zipBuffer, 'app.zip')
    .expect(201)
  return (installResponse.body as { app: { identifier: string } }).app
}

describe('Server - Settings', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      // debug: true,
    })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it(`should get the server settings`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const getSettingsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(getSettingsResponse.response.status).toEqual(200)
    expect(getSettingsResponse.data).toEqual({
      settings: {
        EMAIL_PROVIDER_CONFIG: null,
        GOOGLE_OAUTH_CONFIG: {
          enabled: false,
          clientId: '',
          clientSecret: '',
        },
        SERVER_HOSTNAME: null,
        SEARCH_CONFIG: { app: null },
        SIGNUP_ENABLED: true,
        SIGNUP_PERMISSIONS: [],
      },
    })
  })

  it(`should set the SIGNUP_ENABLED setting`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setSettingsResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'SIGNUP_ENABLED' } },
        body: { value: true },
      },
    )
    expect(setSettingsResponse.response.status).toEqual(200)
    expect(setSettingsResponse.data?.settingKey).toEqual('SIGNUP_ENABLED')

    const newSettingsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(newSettingsResponse.data).toEqual({
      settings: {
        EMAIL_PROVIDER_CONFIG: null,
        GOOGLE_OAUTH_CONFIG: {
          enabled: false,
          clientId: '',
          clientSecret: '',
        },
        SERVER_HOSTNAME: null,
        SIGNUP_ENABLED: true,
        SEARCH_CONFIG: { app: null },
        SIGNUP_PERMISSIONS: [],
      },
    })
  })

  it(`should set the SIGNUP_PERMISSIONS server setting`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setSettingsResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'SIGNUP_PERMISSIONS' } },
        body: { value: ['TEST_PERMISSION'] },
      },
    )
    expect(setSettingsResponse.response.status).toEqual(200)
    expect(setSettingsResponse.data?.settingKey).toEqual('SIGNUP_PERMISSIONS')

    const newSettingsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(newSettingsResponse.data).toEqual({
      settings: {
        EMAIL_PROVIDER_CONFIG: null,
        GOOGLE_OAUTH_CONFIG: {
          enabled: false,
          clientId: '',
          clientSecret: '',
        },
        SIGNUP_PERMISSIONS: ['TEST_PERMISSION'],
        SERVER_HOSTNAME: null,
        SEARCH_CONFIG: { app: null },
        SIGNUP_ENABLED: true,
      },
    })
  })

  it(`should set and reset the SEARCH_CONFIG server setting`, async () => {
    await testModule?.setServerStorageLocation()

    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const initialSettingsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    const initialSearchConfig =
      initialSettingsResponse.data?.settings.SEARCH_CONFIG

    // Install a valid search app
    const appSlug = `searchapp${Date.now()}`
    const zipBuffer = await buildAppZip({
      slug: appSlug,
      label: 'Search App',
      config: createTestAppConfig(appSlug, 'Search App', {
        runtimeWorkers: {
          search_worker: {
            entrypoint: 'search.ts',
            description: 'Search worker',
          },
        },
        systemRequestRuntimeWorkers: {
          performSearch: ['search_worker'],
        },
      }),
      files: [
        {
          path: 'workers/search.ts',
          content: 'export default function() {}',
        },
      ],
    })

    const { identifier: appIdentifier } = await installApp(
      testModule!,
      accessToken,
      zipBuffer,
    )

    const searchConfig = {
      app: {
        identifier: appIdentifier,
        workerIdentifier: 'search_worker',
      },
    }

    const setSettingsResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'SEARCH_CONFIG' } },
        body: { value: searchConfig },
      },
    )
    expect(setSettingsResponse.response.status).toEqual(200)
    expect(setSettingsResponse.data?.settingKey).toEqual('SEARCH_CONFIG')

    const updatedSettingsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(updatedSettingsResponse.data?.settings.SEARCH_CONFIG).toEqual(
      searchConfig,
    )

    await apiClient(accessToken).DELETE(
      '/api/v1/server/settings/{settingKey}',
      { params: { path: { settingKey: 'SEARCH_CONFIG' } } },
    )

    const resetSettingsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(resetSettingsResponse.data?.settings.SEARCH_CONFIG).toEqual(
      initialSearchConfig,
    )

    await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
      params: { path: { settingKey: 'SEARCH_CONFIG' } },
      body: { value: { app: null } },
    })

    const setNullSettingsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(setNullSettingsResponse.data?.settings.SEARCH_CONFIG).toEqual({
      app: null,
    })
  })

  it(`should reset a server setting`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setSettingsResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'SIGNUP_ENABLED' } },
        body: { value: true },
      },
    )
    expect(setSettingsResponse.response.status).toEqual(200)
    expect(setSettingsResponse.data?.settingKey).toEqual('SIGNUP_ENABLED')

    const newSettingsResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(newSettingsResponse.data).toEqual({
      settings: {
        EMAIL_PROVIDER_CONFIG: null,
        GOOGLE_OAUTH_CONFIG: {
          enabled: false,
          clientId: '',
          clientSecret: '',
        },
        SIGNUP_ENABLED: true,
        SEARCH_CONFIG: { app: null },
        SERVER_HOSTNAME: null,
        SIGNUP_PERMISSIONS: [],
      },
    })

    await apiClient(accessToken).DELETE(
      '/api/v1/server/settings/{settingKey}',
      { params: { path: { settingKey: 'SIGNUP_ENABLED' } } },
    )

    const settingsAfterKeyReset = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(settingsAfterKeyReset.data).toEqual({
      settings: {
        EMAIL_PROVIDER_CONFIG: null,
        GOOGLE_OAUTH_CONFIG: {
          enabled: false,
          clientId: '',
          clientSecret: '',
        },
        SERVER_HOSTNAME: null,
        SEARCH_CONFIG: { app: null },
        SIGNUP_ENABLED: true,
        SIGNUP_PERMISSIONS: [],
      },
    })
  })

  it(`should fail to set the server setting if not admin`, async () => {
    const admin = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const regularUser = await createTestUser(testModule!, {
      username: 'userA',
      password: '123',
    })

    const setSettingsResponse = await apiClient(
      regularUser.session.accessToken,
    ).PUT('/api/v1/server/settings/{settingKey}', {
      params: { path: { settingKey: 'SIGNUP_ENABLED' } },
      body: { value: true },
    })
    expect(setSettingsResponse.response.status).toEqual(401)

    const newSettingsResponse = await apiClient(admin.session.accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(newSettingsResponse.data).toEqual({
      settings: {
        EMAIL_PROVIDER_CONFIG: null,
        GOOGLE_OAUTH_CONFIG: {
          enabled: false,
          clientId: '',
          clientSecret: '',
        },
        SERVER_HOSTNAME: null,
        SEARCH_CONFIG: { app: null },
        SIGNUP_ENABLED: true,
        SIGNUP_PERMISSIONS: [],
      },
    })
  })

  it(`should set and get EMAIL_PROVIDER_CONFIG (Resend)`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const resendConfig = {
      from: 'test@example.com',
      provider: 'resend' as const,
      config: { apiKey: 're_test_key_123' },
    }

    const setResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: { value: resendConfig },
      },
    )
    expect(setResponse.response.status).toEqual(200)
    expect(setResponse.data?.settingKey).toEqual('EMAIL_PROVIDER_CONFIG')
    expect(setResponse.data?.settingValue).toEqual(resendConfig)

    const getResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(getResponse.response.status).toEqual(200)
    expect(getResponse.data?.settings.EMAIL_PROVIDER_CONFIG).toEqual(
      resendConfig,
    )
  })

  it(`should set and get EMAIL_PROVIDER_CONFIG (SMTP)`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const smtpConfig = {
      provider: 'smtp' as const,
      from: 'test@example.com',
      config: {
        host: 'smtp.example.com',
        port: 587,
        username: 'user',
        password: 'secret',
      },
    }

    const setResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: { value: smtpConfig },
      },
    )
    expect(setResponse.response.status).toEqual(200)
    expect(setResponse.data?.settingKey).toEqual('EMAIL_PROVIDER_CONFIG')
    expect(setResponse.data?.settingValue).toEqual(smtpConfig)

    const getResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(getResponse.response.status).toEqual(200)
    expect(getResponse.data?.settings.EMAIL_PROVIDER_CONFIG).toEqual(smtpConfig)
  })

  it(`should reset EMAIL_PROVIDER_CONFIG`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const resendConfig = {
      provider: 'resend' as const,
      from: 'test@example.com',
      config: { apiKey: 're_test_key' },
    }

    await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
      params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
      body: { value: resendConfig },
    })

    const getAfterSet = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(getAfterSet.data?.settings.EMAIL_PROVIDER_CONFIG).toEqual(
      resendConfig,
    )

    await apiClient(accessToken).DELETE(
      '/api/v1/server/settings/{settingKey}',
      { params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } } },
    )

    const getAfterReset = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(getAfterReset.data?.settings.EMAIL_PROVIDER_CONFIG).toBeNull()
  })

  it(`should set EMAIL_PROVIDER_CONFIG to null (disabled)`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
      params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
      body: {
        value: {
          provider: 'resend',
          config: { apiKey: 're_foo' },
        },
      },
    })

    const setNullResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: { value: null },
      },
    )
    expect(setNullResponse.response.status).toEqual(200)

    const getResponse = await apiClient(accessToken).GET(
      '/api/v1/server/settings',
    )
    expect(getResponse.data?.settings.EMAIL_PROVIDER_CONFIG).toBeNull()
  })

  it(`should reject EMAIL_PROVIDER_CONFIG with invalid Resend config (empty apiKey)`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: {
          value: {
            provider: 'resend',
            config: { apiKey: '' },
          },
        },
      },
    )
    expect(setResponse.response.status).toEqual(400)
  })

  it(`should reject EMAIL_PROVIDER_CONFIG with invalid SMTP config (missing required fields)`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: {
          value: {
            provider: 'smtp',
            config: {
              host: '',
              port: 587,
              username: 'user',
              password: 'secret',
            },
          },
        },
      },
    )
    expect(setResponse.response.status).toEqual(400)
  })

  it(`should reject EMAIL_PROVIDER_CONFIG with invalid SMTP config (port out of range)`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: {
          value: {
            provider: 'smtp',
            config: {
              host: 'smtp.example.com',
              port: 99999,
              username: 'user',
              password: 'secret',
            },
          },
        },
      },
    )
    expect(setResponse.response.status).toEqual(400)
  })

  it(`should reject EMAIL_PROVIDER_CONFIG with unknown provider`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: {
          value: {
            provider: 'sendgrid',
            config: { apiKey: 'sg_foo' },
          },
        },
      },
    )
    expect(setResponse.response.status).toEqual(400)
  })

  it(`should reject EMAIL_PROVIDER_CONFIG with wrong config shape for provider`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const setResponse = await apiClient(accessToken).PUT(
      '/api/v1/server/settings/{settingKey}',
      {
        params: { path: { settingKey: 'EMAIL_PROVIDER_CONFIG' } },
        body: {
          value: {
            provider: 'resend',
            config: {
              host: 'smtp.example.com',
              port: 587,
              username: 'user',
              password: 'secret',
            },
          },
        },
      },
    )
    expect(setResponse.response.status).toEqual(400)
  })

  describe('SEARCH_CONFIG validation', () => {
    it('should reject setting SEARCH_CONFIG with non-existent app', async () => {
      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'admin',
        password: '123',
        admin: true,
      })

      const response = await apiClient(accessToken).PUT(
        '/api/v1/server/settings/{settingKey}',
        {
          params: { path: { settingKey: 'SEARCH_CONFIG' } },
          body: {
            value: {
              app: {
                identifier: 'non_existent_app_12345',
                workerIdentifier: 'search_worker',
              },
            },
          },
        },
      )

      expect(response.response.status).toEqual(404)
      expect(response.error?.message).toContain('not found')
    })

    it('should reject setting SEARCH_CONFIG with disabled app', async () => {
      await testModule?.setServerStorageLocation()

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'admin',
        password: '123',
        admin: true,
      })

      // Create and install a test app with search capability
      const appSlug = `searchapp${Date.now()}`
      const zipBuffer = await buildAppZip({
        slug: appSlug,
        label: 'Search App',
        config: createTestAppConfig(appSlug, 'Search App', {
          runtimeWorkers: {
            search_worker: {
              entrypoint: 'search.ts',
              description: 'Search worker',
            },
          },
          systemRequestRuntimeWorkers: {
            performSearch: ['search_worker'],
          },
        }),
        files: [
          {
            path: 'workers/search.ts',
            content: 'export default function() {}',
          },
        ],
      })

      // Install the app
      const { identifier: appIdentifier } = await installApp(
        testModule!,
        accessToken,
        zipBuffer,
      )

      // Disable the app
      await apiClient(accessToken).PUT(
        '/api/v1/server/apps/{appIdentifier}/enabled',
        {
          params: { path: { appIdentifier } },
          body: { enabled: false },
        },
      )

      // Try to set it as search provider
      const response = await apiClient(accessToken).PUT(
        '/api/v1/server/settings/{settingKey}',
        {
          params: { path: { settingKey: 'SEARCH_CONFIG' } },
          body: {
            value: {
              app: {
                identifier: appIdentifier,
                workerIdentifier: 'search_worker',
              },
            },
          },
        },
      )

      expect(response.response.status).toEqual(503)
      expect(response.error?.message).toContain('disabled')
    })

    it('should reject setting SEARCH_CONFIG with non-existent worker', async () => {
      await testModule?.setServerStorageLocation()

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'admin',
        password: '123',
        admin: true,
      })

      // Create and install a test app
      const appSlug = `searchapp${Date.now()}`
      const zipBuffer = await buildAppZip({
        slug: appSlug,
        label: 'Search App',
        config: createTestAppConfig(appSlug, 'Search App', {
          runtimeWorkers: {
            other_worker: {
              entrypoint: 'other.ts',
              description: 'Other worker',
            },
          },
          systemRequestRuntimeWorkers: {
            performSearch: ['other_worker'],
          },
        }),
        files: [
          {
            path: 'workers/other.ts',
            content: 'export default function() {}',
          },
        ],
      })

      // Install the app
      const { identifier: appIdentifier } = await installApp(
        testModule!,
        accessToken,
        zipBuffer,
      )

      // Try to set it with a non-existent worker
      const response = await apiClient(accessToken).PUT(
        '/api/v1/server/settings/{settingKey}',
        {
          params: { path: { settingKey: 'SEARCH_CONFIG' } },
          body: {
            value: {
              app: {
                identifier: appIdentifier,
                workerIdentifier: 'non_existent_worker',
              },
            },
          },
        },
      )

      expect(response.response.status).toEqual(404)
      expect(response.error?.message).toContain('not found')
    })

    it('should reject setting SEARCH_CONFIG with unauthorized worker', async () => {
      await testModule?.setServerStorageLocation()

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'admin',
        password: '123',
        admin: true,
      })

      // Create and install a test app with a worker that's NOT in performSearch
      const appSlug = `searchapp${Date.now()}`
      const zipBuffer = await buildAppZip({
        slug: appSlug,
        label: 'Search App',
        config: createTestAppConfig(appSlug, 'Search App', {
          runtimeWorkers: {
            authorized_worker: {
              entrypoint: 'authorized.ts',
              description: 'Authorized worker',
            },
            unauthorized_worker: {
              entrypoint: 'unauthorized.ts',
              description: 'Unauthorized worker',
            },
          },
          systemRequestRuntimeWorkers: {
            performSearch: ['authorized_worker'], // Only this one is authorized
          },
        }),
        files: [
          {
            path: 'workers/authorized.ts',
            content: 'export default function() {}',
          },
          {
            path: 'workers/unauthorized.ts',
            content: 'export default function() {}',
          },
        ],
      })

      const { identifier: appIdentifier } = await installApp(
        testModule!,
        accessToken,
        zipBuffer,
      )

      // Try to set it with the unauthorized worker
      const response = await apiClient(accessToken).PUT(
        '/api/v1/server/settings/{settingKey}',
        {
          params: { path: { settingKey: 'SEARCH_CONFIG' } },
          body: {
            value: {
              app: {
                identifier: appIdentifier,
                workerIdentifier: 'unauthorized_worker',
              },
            },
          },
        },
      )

      expect(response.response.status).toEqual(403)
      expect(response.error?.message).toContain('not authorized')
    })

    it('should successfully set SEARCH_CONFIG with valid app and worker', async () => {
      await testModule?.setServerStorageLocation()

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'admin',
        password: '123',
        admin: true,
      })

      // Create and install a valid search app
      const appSlug = `searchapp${Date.now()}`
      const zipBuffer = await buildAppZip({
        slug: appSlug,
        label: 'Search App',
        config: createTestAppConfig(appSlug, 'Search App', {
          runtimeWorkers: {
            search_worker: {
              entrypoint: 'search.ts',
              description: 'Search worker',
            },
          },
          systemRequestRuntimeWorkers: {
            performSearch: ['search_worker'],
          },
        }),
        files: [
          {
            path: 'workers/search.ts',
            content: 'export default function() {}',
          },
        ],
      })

      // Install the app
      const { identifier: appIdentifier } = await installApp(
        testModule!,
        accessToken,
        zipBuffer,
      )

      // Set it as search provider
      const response = await apiClient(accessToken).PUT(
        '/api/v1/server/settings/{settingKey}',
        {
          params: { path: { settingKey: 'SEARCH_CONFIG' } },
          body: {
            value: {
              app: {
                identifier: appIdentifier,
                workerIdentifier: 'search_worker',
              },
            },
          },
        },
      )

      expect(response.response.status).toEqual(200)
      expect(response.data?.settingKey).toEqual('SEARCH_CONFIG')

      // Verify it was set correctly
      const getResponse = await apiClient(accessToken).GET(
        '/api/v1/server/settings',
      )
      expect(getResponse.data?.settings.SEARCH_CONFIG).toEqual({
        app: {
          identifier: appIdentifier,
          workerIdentifier: 'search_worker',
        },
      })
    })

    it('should clear SEARCH_CONFIG when app is disabled', async () => {
      await testModule?.setServerStorageLocation()

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'admin',
        password: '123',
        admin: true,
      })

      // Create and install a search app
      const appSlug = `searchapp${Date.now()}`
      const zipBuffer = await buildAppZip({
        slug: appSlug,
        label: 'Search App',
        config: createTestAppConfig(appSlug, 'Search App', {
          runtimeWorkers: {
            search_worker: {
              entrypoint: 'search.ts',
              description: 'Search worker',
            },
          },
          systemRequestRuntimeWorkers: {
            performSearch: ['search_worker'],
          },
        }),
        files: [
          {
            path: 'workers/search.ts',
            content: 'export default function() {}',
          },
        ],
      })

      // Install the app
      const { identifier: appIdentifier } = await installApp(
        testModule!,
        accessToken,
        zipBuffer,
      )

      // Set it as search provider
      await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
        params: { path: { settingKey: 'SEARCH_CONFIG' } },
        body: {
          value: {
            app: {
              identifier: appIdentifier,
              workerIdentifier: 'search_worker',
            },
          },
        },
      })

      // Verify it was set
      const getResponse1 = await apiClient(accessToken).GET(
        '/api/v1/server/settings',
      )
      expect(getResponse1.data?.settings.SEARCH_CONFIG?.app).not.toBeNull()

      // Disable the app
      await apiClient(accessToken).PUT(
        '/api/v1/server/apps/{appIdentifier}/enabled',
        {
          params: { path: { appIdentifier } },
          body: { enabled: false },
        },
      )

      // Verify SEARCH_CONFIG was cleared
      const getResponse2 = await apiClient(accessToken).GET(
        '/api/v1/server/settings',
      )
      expect(getResponse2.data?.settings.SEARCH_CONFIG).toEqual({
        app: null,
      })
    })

    it('should clear SEARCH_CONFIG when app is uninstalled', async () => {
      await testModule?.setServerStorageLocation()

      const {
        session: { accessToken },
      } = await createTestUser(testModule!, {
        username: 'admin',
        password: '123',
        admin: true,
      })

      // Create and install a search app
      const appSlug = `searchapp${Date.now()}`
      const zipBuffer = await buildAppZip({
        slug: appSlug,
        label: 'Search App',
        config: createTestAppConfig(appSlug, 'Search App', {
          runtimeWorkers: {
            search_worker: {
              entrypoint: 'search.ts',
              description: 'Search worker',
            },
          },
          systemRequestRuntimeWorkers: {
            performSearch: ['search_worker'],
          },
        }),
        files: [
          {
            path: 'workers/search.ts',
            content: 'export default function() {}',
          },
        ],
      })

      // Install the app
      const { identifier: appIdentifier } = await installApp(
        testModule!,
        accessToken,
        zipBuffer,
      )

      // Set it as search provider
      await apiClient(accessToken).PUT('/api/v1/server/settings/{settingKey}', {
        params: { path: { settingKey: 'SEARCH_CONFIG' } },
        body: {
          value: {
            app: {
              identifier: appIdentifier,
              workerIdentifier: 'search_worker',
            },
          },
        },
      })

      // Verify it was set
      const getResponse1 = await apiClient(accessToken).GET(
        '/api/v1/server/settings',
      )
      expect(getResponse1.data?.settings.SEARCH_CONFIG?.app).not.toBeNull()

      // Uninstall the app
      await apiClient(accessToken).DELETE(
        '/api/v1/server/apps/{appIdentifier}',
        {
          params: { path: { appIdentifier } },
        },
      )

      // Verify SEARCH_CONFIG was cleared
      const getResponse2 = await apiClient(accessToken).GET(
        '/api/v1/server/settings',
      )
      expect(getResponse2.data?.settings.SEARCH_CONFIG).toEqual({
        app: null,
      })
    })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
