import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { CoreModule } from 'src/core/core.module'
import * as request from 'supertest'

describe('Auth', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  it(`POST /auth/signup`, () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({ login: '', password: '' })
      .expect(200)
    // .expect({
    //   data: {},
    // })
  })

  afterAll(async () => {
    await app.close()
  })
})
