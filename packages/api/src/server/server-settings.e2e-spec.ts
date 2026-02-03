import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'server'

describe('Server - Settings', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
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
        SIGNUP_ENABLED: true,
      },
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

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
