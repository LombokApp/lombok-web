import { Test } from '@nestjs/testing'
import { RedisService } from 'src/cache/redis.service'
import { CoreTestModule } from 'src/core/core-test.module'
import { OrmService } from 'src/orm/orm.service'
import { QueueService } from 'src/queue/queue.service'

import { ormConfig } from '../../orm/config'

export async function buildTestModule(dbName: string) {
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

  const moduleRef = await Test.createTestingModule({
    imports: [CoreTestModule],
    providers: [],
  })
    .overrideProvider(ormConfig.KEY)
    .useValue({ ...ormConfig(), dbName: `stellaris_test__${dbName}` })
    .overrideProvider(QueueService)
    .useValue(mockedQueueService)
    .overrideProvider(RedisService)
    .useValue(redisService)
    .compile()

  const app = moduleRef.createNestApplication()

  const ormService = await app.resolve(OrmService)
  await ormService.removeTestDatabase(dbName)

  await app.enableShutdownHooks().init()

  return {
    app,
    shutdown: async () => {
      await app.close()
    },
  }
}
