import 'reflect-metadata'

import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import path from 'path'
import { container } from 'tsyringe'

import { App } from '../../src/app'
import { OrmService } from '../../src/orm/orm.service'

const app = container.resolve(App)
const ormService = container.resolve(OrmService)

jest.setTimeout(25000)

global.beforeAll(async () => {
  await app.init()

  await ormService.db.execute(sql`DROP SCHEMA public CASCADE;`)
  await ormService.db.execute(sql`CREATE SCHEMA public;`)
  await ormService.db.execute(sql`GRANT ALL ON SCHEMA public TO public;`)

  await ormService.db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`)
  await ormService.db.execute(sql`CREATE SCHEMA drizzle;`)
  await ormService.db.execute(sql`GRANT ALL ON SCHEMA drizzle TO public;`)

  await migrate(ormService.db, {
    migrationsFolder: path.join(__dirname, '../../src/orm/migrations'),
  })
})

global.afterEach(async () => {
  await ormService.db.execute(sql`
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
