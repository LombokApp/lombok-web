import type { TestModule } from 'src/test/test.types'
import { buildTestModule } from 'src/test/test.util'
import request from 'supertest'

const TEST_MODULE_KEY = 'auth'

describe('Auth', () => {
  let testModule: TestModule | undefined

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
  })

  afterEach(async () => {
    await testModule?.resetDb()
  })

  it(`POST /api/v1/auth/signup`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const _response = await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        email: 'steven@stellariscloud.com',
        password: '123',
      })
      .expect(201)
  })

  it(`POST /api/v1/auth/signup (without email)`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const _response = await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)
  })

  it(`POST /api/v1/auth/signup (with conflict)`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const _response = await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        email: 'steven@stellariscloud.com',
        password: '123',
      })
      .expect(201)

    // dup email
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans2',
        email: 'steven@stellariscloud.com',
        password: '123',
      })
      .expect(409)

    // dup username
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        email: 'steven2@stellariscloud.com',
        password: '123',
      })
      .expect(409)

    // unique should still work
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans2',
        email: 'steven2@stellariscloud.com',
        password: '123',
      })
      .expect(201)
  })

  it(`POST /api/v1/auth/signup (bad signup input)`, async () => {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(testModule?.app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(input)
        .expect(400)
        .catch((e) => {
          console.log('Failed input:', input)
          throw e
        })
    }
  })

  it(`POST /api/v1/auth/login`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/login')
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    const {
      body: {
        session: { accessToken },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    } = await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        login: 'mekpans',
        password: '123',
      })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const viewerResponse = await request(testModule?.app.getHttpServer())
      .get('/api/v1/viewer')
      .auth(accessToken as string, { type: 'bearer' })
      .send()

    expect(viewerResponse.statusCode).toEqual(200)
    expect(viewerResponse.body.user.username).toEqual('mekpans')
    expect(viewerResponse.body.user.isAdmin).toEqual(false)
    expect(viewerResponse.body.user.permissions).toEqual([])
    expect(viewerResponse.body.user.name).toBeNull()
  })

  it(`should fail in fetching viewer without token`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(testModule?.app.getHttpServer())
      .get('/api/v1/viewer')
      .send()

    // console.log(response)
    expect(response.status).toBe(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
