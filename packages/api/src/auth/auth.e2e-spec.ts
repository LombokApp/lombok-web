import { buildTestModule } from 'src/core/utils/test.util'
import request from 'supertest'

const TEST_MODULE_KEY = 'auth'

describe('Auth', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`POST /auth/signup`, async () => {
    const _response = await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans',
        email: 'steven@stellariscloud.com',
        password: '123',
      })
      .expect(201)
  })

  it(`POST /auth/signup (without email)`, async () => {
    const _response = await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)
  })

  it(`POST /auth/signup (with conflict)`, async () => {
    const _response = await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans',
        email: 'steven@stellariscloud.com',
        password: '123',
      })
      .expect(201)

    // dup email
    await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans2',
        email: 'steven@stellariscloud.com',
        password: '123',
      })
      .expect(409)

    // dup username
    await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans',
        email: 'steven2@stellariscloud.com',
        password: '123',
      })
      .expect(409)

    // unique should still work
    await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans2',
        email: 'steven2@stellariscloud.com',
        password: '123',
      })
      .expect(201)
  })

  it(`POST /auth/signup (bad signup input)`, async () => {
    const inputs = [
      {
        INVALID_KEY: 'mekpans',
        email: 'steven@stellariscloud.com',
        password: '123',
      },
      {
        username:
          'mekpans_toolong__________________________________________________',
        email: 'steven@stellariscloud.com',
        password: '123',
      },
      {
        username: 'mekpans',
        email: 'steven@stellariscloud.com',
        INVALID_KEY: '123',
      },
    ]
    for (const input of inputs) {
      await request(testModule?.app.getHttpServer())
        .post('/auth/signup')
        .send(input)
        .expect(400)
        .catch((e) => {
          console.log('Failed input:', input)
          throw e
        })
    }
  })

  it(`POST /auth/login`, async () => {
    await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    const response = await request(testModule?.app.getHttpServer())
      .post('/auth/login')
      .send({
        login: 'mekpans',
        password: '123',
      })

    expect(response.statusCode).toEqual(201)
    expect(response.body.session.user).toBeUndefined()
    expect(response.body.session.accessToken.length).toBeGreaterThan(0)
    expect(response.body.session.refreshToken.length).toBeGreaterThan(0)
  })

  it(`should succeed in fetching viewer with token`, async () => {
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

  it(`should fail in fetching viewer without token`, async () => {
    const response = await request(testModule?.app.getHttpServer())
      .get('/viewer')
      .send()

    // console.log(response)
    expect(response.status).toBe(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
