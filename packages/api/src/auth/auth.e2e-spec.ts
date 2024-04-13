import { type INestApplication } from '@nestjs/common'
import { OrmService } from 'src/orm/orm.service'
import { buildTestModule } from 'src/core/utils/test.util'
import * as request from 'supertest'

describe('Auth', () => {
  let app: INestApplication
  const TEST_DB_NAME = 'auth'

  beforeAll(async () => {
    app = await buildTestModule(TEST_DB_NAME)
  })

  it(`POST /auth/signup`, async () => {
    const _response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'dsf', email: 'dsf@poop.com', password: 'sdf' })
      .expect(201)
  })

  afterAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    await app?.close()
    const ormService = await app.resolve(OrmService)
    await ormService.removeTestDatabase(TEST_DB_NAME)
  })
})
