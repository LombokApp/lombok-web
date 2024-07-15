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
    await testModule?.resetDb()
  })

  it(`should get the server settings`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const settings = await apiClient
      .serverApi({ accessToken })
      .getServerSettings()

    expect(settings.status).toEqual(200)
    expect(settings.data).toEqual({ settings: {} })
  })

  it(`should set the SIGNUP_ENABLED setting`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const settings = await apiClient
      .serverApi({ accessToken })
      .setServerSetting({
        settingKey: 'SIGNUP_ENABLED',
        setSettingInputDTO: { value: true },
      })
    expect(settings.status).toEqual(200)
    expect(settings.data.settingKey).toEqual('SIGNUP_ENABLED')

    const newSettings = await apiClient
      .serverApi({ accessToken })
      .getServerSettings()

    expect(newSettings.data).toEqual({ settings: { SIGNUP_ENABLED: true } })
  })

  it(`should set the SIGNUP_PERMISSIONS server setting`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const settings = await apiClient
      .serverApi({ accessToken })
      .setServerSetting({
        settingKey: 'SIGNUP_PERMISSIONS',
        setSettingInputDTO: { value: ['TEST_PERMISSION'] },
      })
    expect(settings.status).toEqual(200)
    expect(settings.data.settingKey).toEqual('SIGNUP_PERMISSIONS')

    const newSettings = await apiClient
      .serverApi({ accessToken })
      .getServerSettings()

    expect(newSettings.data).toEqual({
      settings: { SIGNUP_PERMISSIONS: ['TEST_PERMISSION'] },
    })
  })

  it(`should reset a server setting`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const settings = await apiClient
      .serverApi({ accessToken })
      .setServerSetting({
        settingKey: 'SIGNUP_ENABLED',
        setSettingInputDTO: { value: true },
      })
    expect(settings.status).toEqual(200)
    expect(settings.data.settingKey).toEqual('SIGNUP_ENABLED')

    const newSettings = await apiClient
      .serverApi({ accessToken })
      .getServerSettings()

    expect(newSettings.data).toEqual({ settings: { SIGNUP_ENABLED: true } })

    await apiClient.serverApi({ accessToken }).resetServerSetting({
      settingKey: 'SIGNUP_ENABLED',
    })

    const settingsAfterKeyReset = await apiClient
      .serverApi({ accessToken })
      .getServerSettings()

    expect(settingsAfterKeyReset.data).toEqual({ settings: {} })
  })

  it(`should fail to set the server setting if not admin`, async () => {
    const admin = await createTestUser(testModule, {
      username: 'mekpans',
      password: '123',
      admin: true,
    })

    const regularUser = await createTestUser(testModule, {
      username: 'userA',
      password: '123',
    })

    const settings = await apiClient
      .serverApi({ accessToken: regularUser.session.accessToken })
      .setServerSetting({
        settingKey: 'SIGNUP_ENABLED',
        setSettingInputDTO: { value: true },
      })
    expect(settings.status).toEqual(401)

    const newSettings = await apiClient
      .serverApi({ accessToken: admin.session.accessToken })
      .getServerSettings()

    expect(newSettings.data).toEqual({ settings: {} })
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
