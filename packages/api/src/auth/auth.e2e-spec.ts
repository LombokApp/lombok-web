import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
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
        email: 'steven@lombokapp.com',
        password: '123',
      })
      .expect(201)
  })

  it(`POST /api/v1/auth/signup (without email)`, async () => {
    const signupResponse = await apiClient().POST('/api/v1/auth/signup', {
      body: {
        username: 'mekpans',
        password: '123',
      },
    })
    expect(signupResponse.response.status).toBe(201)
    expect(signupResponse.data).toBeDefined()
  })

  it(`POST /api/v1/auth/signup (with conflict)`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const _response = await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        email: 'steven@lombokapp.com',
        password: '123',
      })
      .expect(201)

    // dup email
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans2',
        email: 'steven@lombokapp.com',
        password: '123',
      })
      .expect(409)

    // dup username
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        email: 'steven2@lombokapp.com',
        password: '123',
      })
      .expect(409)

    // unique should still work
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans2',
        email: 'steven2@lombokapp.com',
        password: '123',
      })
      .expect(201)
  })

  it(`POST /api/v1/auth/signup (bad signup input)`, async () => {
    const inputs = [
      {
        INVALID_KEY: 'mekpans',
        email: 'steven@lombokapp.com',
        password: '123',
      },
      {
        username:
          'mekpans_toolong__________________________________________________',
        email: 'steven@lombokapp.com',
        password: '123',
      },
      {
        username: 'mekpans',
        email: 'steven@lombokapp.com',
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

    const loginResponse = await apiClient().POST('/api/v1/auth/login', {
      body: {
        login: 'mekpans',
        password: '123',
      },
    })

    expect(loginResponse.response.status).toEqual(201)
    expect(loginResponse.error).toBeUndefined()
    expect(loginResponse.data).toBeDefined()

    if (!loginResponse.data) {
      throw new Error('No response data received')
    }

    expect(loginResponse.data.session.accessToken.length).toBeGreaterThan(0)
    expect(loginResponse.data.session.refreshToken.length).toBeGreaterThan(0)
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

    const loginResponse = await apiClient().POST('/api/v1/auth/login', {
      body: {
        login: 'mekpans',
        password: '123',
      },
    })

    expect(loginResponse.data).toBeDefined()

    if (!loginResponse.data) {
      throw new Error('Login failed - no response data')
    }

    const { accessToken } = loginResponse.data.session

    const viewerResponse = await apiClient(accessToken).GET('/api/v1/viewer')
    expect(viewerResponse.response.status).toEqual(200)
    expect(viewerResponse.data).toBeDefined()

    if (!viewerResponse.data) {
      throw new Error('Viewer request failed - no response data')
    }

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

  it(`should succeed in extending session with refreshToken`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    const loginResponse = await apiClient().POST('/api/v1/auth/login', {
      body: {
        login: 'mekpans',
        password: '123',
      },
    })

    expect(loginResponse.error).toBeUndefined()
    expect(loginResponse.data).toBeDefined()

    if (!loginResponse.data) {
      throw new Error('Login failed - no response data')
    }

    const { refreshToken } = loginResponse.data.session

    const refreshTokenResponse = await apiClient().POST(
      '/api/v1/auth/{refreshToken}',
      {
        params: { path: { refreshToken } },
      },
    )

    expect(refreshTokenResponse.data).toBeDefined()

    if (!refreshTokenResponse.data) {
      throw new Error('Refresh token request failed - no response data')
    }

    expect(refreshTokenResponse.response.status).toEqual(201)
    const sessionRows = await testModule
      ?.getOrmService()
      .db.query.sessionsTable.findMany()
    expect(sessionRows?.length).toEqual(1)
  })

  it(`should return a 401 when attempting to extend session with old refreshToken`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    const loginResponse = await apiClient().POST('/api/v1/auth/login', {
      body: {
        login: 'mekpans',
        password: '123',
      },
    })

    expect(loginResponse.error).toBeUndefined()
    expect(loginResponse.data).toBeDefined()

    if (!loginResponse.data) {
      throw new Error('Login failed - no response data')
    }

    const { refreshToken } = loginResponse.data.session

    const refreshTokenResponse = await apiClient().POST(
      '/api/v1/auth/{refreshToken}',
      {
        params: {
          path: {
            refreshToken: `${refreshToken.split(':')[0]}:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwOi8vc3RlbGxhcmlzY2xvdWQubG9jYWxob3N0IiwianRpIjoiMTk2YjM1ZjctYTJiNy00YTk0LTg4NjUtZTYyMmVlNjNjY2E3OjM3M2I0NWMxLTI1MzEtNDM4Yy1iZTdlLTJkZTY1YjBlMzI4NyIsInNjcCI6W10sInN1YiI6IlVTRVI6YmYwNTMyNDctMDA3NC00ZjVmLWFiOWYtNTFiYTBlYzdiMWFhIiwiaWF0IjoxNzM5NjMwMjAwLCJleHAiOjE3NDA5MjYyMDB9.Nu2n6b9EEotEp6an0I2T_hbRnYISTaaBtU4h74hGQN8`,
          },
        },
      },
    )

    expect(refreshTokenResponse.response.status).toEqual(401)
    expect(refreshTokenResponse.response.status).toBe(401)
  })

  it(`should return a 401 when attempting to extend session with malformed refreshToken`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(testModule?.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        username: 'mekpans',
        password: '123',
      })
      .expect(201)

    const refreshTokenResponse = await apiClient().POST(
      '/api/v1/auth/{refreshToken}',
      {
        params: { path: { refreshToken: '_pooprefreshtoken_' } },
      },
    )
    expect(refreshTokenResponse.error).toBeDefined()
    expect(refreshTokenResponse.response.status).toBe(401)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
