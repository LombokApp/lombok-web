import { buildTestModule, createTestUser } from 'src/test/test.util'

const TEST_MODULE_KEY = 'viewer'

describe('Viewer', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
  })

  afterEach(async () => {
    await testModule?.resetAppState()
  })

  it(`should get viewer`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const viewerResponse = await testModule!.apiClient
      .viewerApi({ accessToken })
      .getViewer()

    expect(viewerResponse.status).toEqual(200)
    expect(viewerResponse.data.user.username).toEqual('testuser')
    expect(viewerResponse.data.user.isAdmin).toEqual(false)
    expect(viewerResponse.data.user.permissions).toEqual([])
    expect(viewerResponse.data.user.name).toBeNull()
  })

  it(`should do viewer update`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const viewerUpdateResponse = await testModule!.apiClient
      .viewerApi({ accessToken })
      .updateViewer({
        viewerUpdateInputDTO: { name: '__NewName__' },
      })

    expect(viewerUpdateResponse.status).toEqual(200)
    expect(viewerUpdateResponse.data.user.name).toEqual('__NewName__')
  })

  it(`should fail viewer update without token`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const viewerUpdateResponse = await testModule!.apiClient
      .viewerApi()
      .updateViewer({
        viewerUpdateInputDTO: { name: '__NewName__' },
      })

    expect(viewerUpdateResponse.status).toEqual(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
