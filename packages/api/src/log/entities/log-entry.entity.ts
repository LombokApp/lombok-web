import type { JsonSerializableObject, LogEntryLevel } from '@lombokapp/types'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { jsonbBase64 } from 'src/orm/util/json-base64-type'

export const logEntriesTable = pgTable(
  'log_entries',
  {
    id: uuid('id').primaryKey(),
    message: text('message').notNull(),
    emitterIdentifier: text('emitterIdentifier').notNull(),
    targetLocationFolderId: uuid('targetLocationFolderId'),
    targetLocationObjectKey: text('targetLocationObjectKey'),
    level: text('level').notNull().$type<LogEntryLevel>(),
    data: jsonbBase64('data').$type<JsonSerializableObject>(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => [
    index('log_entries_target_location_folder_id_idx').on(
      table.targetLocationFolderId,
    ),
  ],
)

export type LogEntry = typeof logEntriesTable.$inferSelect
export type NewLogEntry = typeof logEntriesTable.$inferInsert
