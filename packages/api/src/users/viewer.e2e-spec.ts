import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
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
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const viewerResponse = await testModule!
      .apiClient(accessToken)
      .GET('/api/v1/viewer')
    expect(viewerResponse.response.status).toEqual(200)
    if (!viewerResponse.data) {
      throw new Error('No data')
    }
    expect(viewerResponse.data.user.username).toEqual('testuser')
    expect(viewerResponse.data.user.isAdmin).toEqual(false)
    expect(viewerResponse.data.user.permissions).toEqual([])
    expect(viewerResponse.data.user.name).toBeNull()
  })

  it(`should do viewer update`, async () => {
    const {
      session: { accessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const viewerUpdateResponse = await testModule!
      .apiClient(accessToken)
      .PUT('/api/v1/viewer', { body: { name: '__NewName__' } })
    expect(viewerUpdateResponse.response.status).toEqual(200)
    expect(viewerUpdateResponse.data?.user.name).toEqual('__NewName__')
  })

  it(`should fail viewer update without token`, async () => {
    const viewerUpdateResponse = await testModule!
      .apiClient()
      .PUT('/api/v1/viewer', { body: { name: '__NewName__' } })
    expect(viewerUpdateResponse.response.status).toEqual(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
