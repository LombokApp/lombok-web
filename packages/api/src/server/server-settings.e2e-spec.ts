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
        SERVER_HOSTNAME: null,
        SIGNUP_ENABLED: true,
        SIGNUP_PERMISSIONS: [],
      },
    })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
