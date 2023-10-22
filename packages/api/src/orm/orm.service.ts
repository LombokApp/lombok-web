import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import path from 'path'
import postgres from 'postgres'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from '../config/env-config.provider'
import { sessionsTable } from '../domains/auth/entities/session.entity'
import {
  foldersRelations,
  foldersTable,
} from '../domains/folder/entities/folder.entity'
import { folderObjectsTable } from '../domains/folder/entities/folder-object.entity'
import { folderOperationsTable } from '../domains/folder-operation/entities/folder-operation.entity'
import { folderOperationObjectsTable } from '../domains/folder-operation/entities/folder-operation-object.entity'
import { serverConfigurationsTable } from '../domains/server/entities/server-configuration.entity'
import { storageLocationsTable } from '../domains/storage-location/entities/storage-location.entity'
import { usersTable } from '../domains/user/entities/user.entity'

export const schema = {
  usersTable,
  sessionsTable,
  storageLocationsTable,
  serverConfigurationsTable,
  foldersTable,
  foldersRelations,
  folderObjectsTable,
  folderOperationsTable,
  folderOperationObjectsTable,
}

@singleton()
export class OrmService {
  constructor(private readonly configProvider: EnvConfigProvider) {}

  private _db?: PostgresJsDatabase<typeof schema>

  get db(): PostgresJsDatabase<typeof schema> {
    if (!this._db) {
      throw new Error('DB is not initialized')
    }
    return this._db
  }

  async init(runMigrations: boolean = false) {
    const queryClient = postgres(
      `postgres://${this.configProvider.getDbConfig().user}:${
        this.configProvider.getDbConfig().password
      }@${this.configProvider.getDbConfig().host}:${
        this.configProvider.getDbConfig().port
      }/${this.configProvider.getDbConfig().name}`,
    )
    this._db = drizzle(queryClient, {
      schema,
    })
    if (runMigrations) {
      await migrate(this._db, {
        migrationsFolder: path.join(__dirname, './migrations'),
      })
    }
  }
}
