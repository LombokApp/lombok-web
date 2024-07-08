import { buildTestModule, registerTestUser } from 'src/test/test.util'
import request from 'supertest'

const TEST_MODULE_KEY = 'users'

describe('Users', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should get viewer`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const viewerResponse = await request(testModule?.app.getHttpServer())
      .get('/viewer')
      .auth(accessToken, { type: 'bearer' })
      .send()

    expect(viewerResponse.statusCode).toEqual(200)
    expect(viewerResponse.body.user.username).toEqual('testuser')
    expect(viewerResponse.body.user.isAdmin).toEqual(false)
    expect(viewerResponse.body.user.permissions).toEqual([])
    expect(viewerResponse.body.user.name).toBeNull()
  })

  it(`should do viewer update`, async () => {
    const {
      session: { accessToken },
    } = await registerTestUser(testModule, {
      username: 'testuser',
      password: '123',
    })

    const viewerResponse = await request(testModule?.app.getHttpServer())
      .put('/viewer')
      .auth(accessToken, { type: 'bearer' })
      .send({
        name: '__NewName__',
      })

    expect(viewerResponse.statusCode).toEqual(200)
    expect(viewerResponse.body.user.name).toEqual('__NewName__')
  })

  it(`should fail viewer update without token`, async () => {
    const viewerResponse = await request(testModule?.app.getHttpServer())
      .put('/viewer')
      .send({
        name: '__NewName__',
      })

    expect(viewerResponse.statusCode).toEqual(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
