import type { TestApiClient, TestModule } from 'src/test/test.types'
import { buildTestModule } from 'src/test/test.util'
import request from 'supertest'

const TEST_MODULE_KEY = 'auth'

describe('Auth', () => {
  let testModule: TestModule | undefined
  let apiClient: TestApiClient

  beforeAll(async () => {
    testModule = await buildTestModule({ testModuleKey: TEST_MODULE_KEY })
    apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await testModule?.resetAppState()
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
    const signupResponse = await apiClient.authApi().signup({
      signupCredentialsDTO: {
        username: 'mekpans',
        password: '123',
      },
    })
    expect(signupResponse.status).toBe(201)
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
      {
        username: 'mekpans',
        email: '',
        password: '123',
      },
    ]
    for (const input of inputs) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(testModule?.app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(input)
        .expect(400)
        .catch((e) => {
          // eslint-disable-next-line no-console
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

    const response = await apiClient.authApi().login({
      loginCredentialsDTO: {
        login: 'mekpans',
        password: '123',
      },
    })

    expect(response.status).toEqual(201)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    expect((response.data.session as any).user).toBeUndefined()
    expect(response.data.session.accessToken.length).toBeGreaterThan(0)
    expect(response.data.session.refreshToken.length).toBeGreaterThan(0)
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
      data: {
        session: { accessToken },
      },
    } = await apiClient.authApi().login({
      loginCredentialsDTO: {
        login: 'mekpans',
        password: '123',
      },
    })

    const viewerResponse = await apiClient
      .viewerApi({ accessToken })
      .getViewer()

    expect(viewerResponse.status).toEqual(200)
    expect(viewerResponse.data.user.username).toEqual('mekpans')
    expect(viewerResponse.data.user.isAdmin).toEqual(false)
    expect(viewerResponse.data.user.permissions).toEqual([])
    expect(viewerResponse.data.user.name).toBeNull()
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
