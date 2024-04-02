import { type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { RedisService } from 'src/cache/redis.service'
import { CoreTestModule } from 'src/core/core-test.module'
import { ormConfig } from 'src/orm/config'
import { QueueService } from 'src/queue/queue.service'
import * as request from 'supertest'

describe('Auth', () => {
  let app: INestApplication
  const mockedQueueService = {
    addJob: () => undefined,
  }

  const redisService = {
    getAll: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    markAsInActive: jest.fn(),
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CoreTestModule],
      providers: [],
    })
      .overrideProvider(ormConfig.KEY)
      .useValue({ ...ormConfig(), dbName: 'alsdfkjslf' })
      .overrideProvider(QueueService)
      .useValue(mockedQueueService)
      .overrideProvider(RedisService)
      .useValue(redisService)
      .compile()

    app = moduleRef.createNestApplication()
    await app.enableShutdownHooks().init()
  })

  it(`POST /auth/signup`, async () => {
    const _response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ login: 'dsf', password: 'sdf' })
      .expect(400)

    // console.log('response:', response)
    // .expect({
    //   data: {},
    // })
    // expect(true).toBe(true)
  })

  afterAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    await app?.close()
  })
})
