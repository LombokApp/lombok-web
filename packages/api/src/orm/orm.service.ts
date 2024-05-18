import { Inject, Injectable } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import * as path from 'path'
import postgres from 'postgres'

import { moduleLogEntriesTable } from '../app/entities/app-log-entry.entity'
import { sessionsTable } from '../auth/entities/session.entity'
import { eventsTable } from '../event/entities/event.entity'
import {
  eventReceiptRelations,
  eventReceiptsTable,
} from '../event/entities/event-receipt.entity'
import {
  foldersRelations,
  foldersTable,
} from '../folders/entities/folder.entity'
import { folderObjectsTable } from '../folders/entities/folder-object.entity'
import { locationsTable } from '../locations/entities/locations.entity'
import { serverConfigurationsTable } from '../server/entities/server-configuration.entity'
import { usersTable } from '../users/entities/user.entity'
import { ormConfig } from './config'

export const dbSchema = {
  usersTable,
  sessionsTable,
  storageLocationsTable: locationsTable,
  serverConfigurationsTable,
  foldersTable,
  foldersRelations,
  folderObjectsTable,
  moduleLogEntriesTable,
  eventsTable,
  eventReceiptsTable,
  eventReceiptRelations,
}

export const TEST_DB_PREFIX = 'stellaris_test__'

@Injectable()
export class OrmService {
  private _db?: PostgresJsDatabase<typeof dbSchema>
  private _client?: postgres.Sql

  constructor(
    @Inject(ormConfig.KEY)
    private readonly _ormConfig: nestjsConfig.ConfigType<typeof ormConfig>,
  ) {}

  get client() {
    if (!this._client) {
      this._client = postgres(
        `postgres://${this._ormConfig.dbUser}:${this._ormConfig.dbPassword}@${this._ormConfig.dbHost}:${this._ormConfig.dbPort}/${this._ormConfig.dbName}`,
        this._ormConfig.disableNoticeLogging
          ? { onnotice: () => undefined }
          : undefined,
      )
    }
    return this._client
  }

  async runWithTestClient(func: (client: postgres.Sql<any>) => Promise<void>) {
    const c = postgres(
      `postgres://${this._ormConfig.dbUser}:${this._ormConfig.dbPassword}@${this._ormConfig.dbHost}:${this._ormConfig.dbPort}/postgres`,
      this._ormConfig.disableNoticeLogging
        ? { onnotice: () => undefined }
        : undefined,
    )
    await func(c).finally(() => void c.end())
  }

  get db(): PostgresJsDatabase<typeof dbSchema> {
    if (!this._db) {
      this._db = drizzle(this.client, {
        schema: dbSchema,
      })
    }
    return this._db
  }

  async initDatabase() {
    if (this._ormConfig.createDatabase) {
      await this.runWithTestClient(async (_c) => {
        const existsResult = await _c.unsafe(
          `SELECT 1 FROM pg_database WHERE datname = '${this._ormConfig.dbName}'`,
        )
        const exists = existsResult.count > 0

        if (!exists) {
          await _c.unsafe(`CREATE DATABASE ${this._ormConfig.dbName};`)
        }
      })
    }

    if (this._ormConfig.runMigrations) {
      await this.migrate()
    }
  }

  async migrate() {
    await migrate(this.db, {
      migrationsFolder: path.join(__dirname, './migrations'),
    })
  }

  async resetTestDb() {
    if (!this._ormConfig.dbName.startsWith(TEST_DB_PREFIX)) {
      throw new Error('Attempt to reset non-test db.')
    }
    await this.truncateTestDatabase()
    await this.migrate()
  }

  async truncateTestDatabase() {
    if (!this._ormConfig.dbName.startsWith(TEST_DB_PREFIX)) {
      throw new Error('Attempt to truncate non-test database.')
    }
    await this._truncateAllTables()
  }

  private async _truncateAllTables() {
    await this.runWithTestClient(async (_c) => {
      const existsResult = await _c.unsafe(
        `SELECT 1 FROM pg_database WHERE datname = '${this._ormConfig.dbName}'`,
      )
      const exists = existsResult.count > 0

      if (!exists) {
        return
      }

      try {
        const tables = await this.client.unsafe(
          `SELECT tablename,schemaname FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema');`,
        )

        if (tables.length > 0) {
          const schemaToTableMapping = tables.reduce(
            (acc, next) => ({
              ...acc,
              [next.schemaname]: (acc[next.schemaname] ?? []).concat(
                next.tablename,
              ),
            }),
            {},
          )

          for (const schema of Object.keys(schemaToTableMapping)) {
            const tableNames = schemaToTableMapping[schema]
              .map((t) => `"${t}"`)
              .join(', ')
            await this.client.begin(async (sql) => {
              await sql`SET CONSTRAINTS ALL DEFERRED`
              await sql.unsafe(`SET SCHEMA '${schema}';`)
              const truncateTablesQuery = `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`
              // console.log('TRUNCATING SCHEMA WITH QUERY:', truncateTablesQuery)
              await sql.unsafe(truncateTablesQuery)
              await sql.unsafe(`SET SCHEMA 'public';`)
              await sql`SET CONSTRAINTS ALL IMMEDIATE`
            })
          }
        }
      } catch (error) {
        console.error('Failed to truncate tables:', error)
        throw error
      }
    })
  }

  async close() {
    await this._client?.end()
  }
}
