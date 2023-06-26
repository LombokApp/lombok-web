import 'reflect-metadata'

import * as r from 'runtypes'
import { container } from 'tsyringe'

import { App } from '../../src/app'
import { EnvConfigProvider } from '../../src/config/env-config.provider'
import { OrmService } from '../../src/orm/orm.service'

const app = container.resolve(App)
const ormService = container.resolve(OrmService)
const configProvider = container.resolve(EnvConfigProvider)

const templateDbName = `${configProvider.getDbConfig().name}_test_template`
const dbName = `${configProvider.getDbConfig().name}_test_${r.String.check(
  process.env.JEST_WORKER_ID,
)}`

jest.setTimeout(25000)

global.beforeAll(async () => {
  await app.init()

  const driver = ormService.orm.em.getDriver()

  await ormService.orm.getSchemaGenerator().dropDatabase(dbName)
  await driver.execute(`CREATE DATABASE ${dbName} TEMPLATE ${templateDbName};`)

  ormService.orm.config.set('dbName', dbName)
  await driver.reconnect()
})

global.afterEach(async () => {
  const driver = ormService.orm.em.getDriver()
  await driver.execute(`
    DO
    $func$
    BEGIN
      IF EXISTS (
        SELECT '*'
          FROM pg_class
          WHERE relkind = 'r'
          AND relnamespace = 'public'::regnamespace)
      THEN
        EXECUTE (
          SELECT 'TRUNCATE TABLE ' || string_agg(oid::regclass::text, ', ') || ' RESTART IDENTITY CASCADE'
            FROM pg_class
            WHERE relkind = 'r'
            AND relnamespace = 'public'::regnamespace
        );
      END IF;
    END
    $func$;
  `)
})

global.afterAll(async () => {
  await app.close()
})
