import { Test } from '@nestjs/testing'
import { RedisService } from 'src/cache/redis.service'
import { CoreTestModule } from 'src/core/core-test.module'
import { OrmService, TEST_DB_PREFIX } from 'src/orm/orm.service'

import { ormConfig } from '../../orm/config'

export async function buildTestModule(dbName: string) {
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
    .useValue({ ...ormConfig(), dbName: `${TEST_DB_PREFIX}${dbName}` })
    .overrideProvider(RedisService)
    .useValue(redisService)
    .compile()

  const app = moduleRef.createNestApplication()

  const ormService = await app.resolve(OrmService)

  // truncate the db before running first init (which will migrate the db)
  await ormService.truncateTestDatabase()

  await app.enableShutdownHooks().init()

  return {
    app,
    shutdown: async () => {
      await app.close()
    },
    resetDb: () => ormService.resetTestDb(),
  }
}
