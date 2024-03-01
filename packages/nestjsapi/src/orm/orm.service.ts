import { Injectable } from '@nestjs/common'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

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
  private readonly _db?: PostgresJsDatabase<typeof schema>

  get db(): PostgresJsDatabase<typeof schema> {
    if (!this._db) {
      throw new Error('DB is not initialized')
    }
    return this._db
  }

  login(_input: { login: string; password: string }): string {
    return 'Hello World!'
  }
}
