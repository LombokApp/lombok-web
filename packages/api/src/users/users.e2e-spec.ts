import { buildTestModule } from 'src/core/utils/test.util'
import request from 'supertest'

const TEST_DB_NAME = 'users'

describe('Users', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule(TEST_DB_NAME)
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`should get viewer`, async () => {
    await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    const {
      body: {
        session: { accessToken },
      },
    } = await request(testModule?.app.getHttpServer())
      .post('/auth/login')
      .send({
        login: 'mekpans',
        password: '123',
      })

    const viewerResponse = await request(testModule?.app.getHttpServer())
      .get('/viewer')
      .auth(accessToken as string, { type: 'bearer' })
      .send()

    expect(viewerResponse.statusCode).toEqual(200)
    expect(viewerResponse.body.user.username).toEqual('mekpans')
    expect(viewerResponse.body.user.isAdmin).toEqual(false)
    expect(viewerResponse.body.user.permissions).toEqual([])
    expect(viewerResponse.body.user.name).toBeNull()
  })

  it(`should do viewer update`, async () => {
    await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    const {
      body: {
        session: { accessToken },
      },
    } = await request(testModule?.app.getHttpServer())
      .post('/auth/login')
      .send({
        login: 'mekpans',
        password: '123',
      })

    const viewerResponse = await request(testModule?.app.getHttpServer())
      .put('/viewer')
      .auth(accessToken as string, { type: 'bearer' })
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
