import { buildTestModule } from 'src/core/utils/test.util'
import * as request from 'supertest'

const TEST_DB_NAME = 'auth'

describe('Auth', () => {
  let testModule: Awaited<ReturnType<typeof buildTestModule>> | undefined

  beforeAll(async () => {
    testModule = await buildTestModule(TEST_DB_NAME)
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

  it(`should fail with bad signup params`, async () => {
    const _response = await request(testModule?.app.getHttpServer())
      .post('/auth/signup')
      .send({
        poop: 'mekpans',
        email: 'steven@stellariscloud.com',
        password: '123',
      })
      .expect(400)
  })

  afterAll(async () => {
    await testModule?.shutdown()
  })
})
