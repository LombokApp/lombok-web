import { Inject, Injectable } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import * as path from 'path'
import * as postgres from 'postgres'

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

export const schema = {
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

@Injectable()
export class OrmService {
  private _db?: PostgresJsDatabase<typeof schema>
  private _client?: postgres.Sql

  constructor(
    @Inject(ormConfig.KEY)
    private readonly _ormConfig: ConfigType<typeof ormConfig>,
  ) {}

  get db(): PostgresJsDatabase<typeof schema> {
    if (!this._db) {
      throw new Error('DB is not initialized')
    }
    return this._db
  }

  async initDatabase() {
    if (this._ormConfig.createDatabase) {
      const sql = postgres(
        `postgres://${this._ormConfig.dbUser}:${this._ormConfig.dbPassword}@${this._ormConfig.dbHost}:${this._ormConfig.dbPort}/postgres`,
      )
      await sql
        .unsafe(`CREATE DATABASE ${this._ormConfig.dbName};`)
        .finally(() => void sql.end())
    }

    this._client = postgres(
      `postgres://${this._ormConfig.dbUser}:${this._ormConfig.dbPassword}@${this._ormConfig.dbHost}:${this._ormConfig.dbPort}/${this._ormConfig.dbName}`,
      this._ormConfig.disableNoticeLogging
        ? { onnotice: () => undefined }
        : undefined,
    )

    this._db = drizzle(this._client, {
      schema,
    })
    if (this._ormConfig.runMigrations) {
      await migrate(this._db, {
        migrationsFolder: path.join(__dirname, './migrations'),
      })
    }
  }

  async removeTestDatabase(databaseName: string) {
    const sql = postgres(
      `postgres://${this._ormConfig.dbUser}:${this._ormConfig.dbPassword}@${this._ormConfig.dbHost}:${this._ormConfig.dbPort}/postgres`,
    )
    await sql
      .unsafe(`DROP DATABASE IF EXISTS stellaris_test__${databaseName};`)
      .finally(() => void sql.end())
  }

  async close() {
    await this._client?.end()
  }
}
