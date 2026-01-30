import type { JsonSerializableObject, LogEntryLevel } from '@lombokapp/types'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { jsonbBase64 } from 'src/orm/util/json-base64-type'

export const logEntriesTable = pgTable(
  'log_entries',
  {
    id: uuid('id').primaryKey(),
    message: text('message').notNull(),
    emitterIdentifier: text('emitter_identifier').notNull(),
    targetLocationFolderId: uuid('target_location_folder_id'),
    targetLocationObjectKey: text('target_location_object_key'),
    level: text('level').notNull().$type<LogEntryLevel>(),
    data: jsonbBase64('data').$type<JsonSerializableObject>(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [
    index('log_entries_target_location_folder_id_idx').on(
      table.targetLocationFolderId,
    ),
    index('log_entries_created_at_idx').on(table.createdAt),
    index('log_entries_emitter_identifier_idx').on(table.emitterIdentifier),
    index('log_entries_folder_created_at_idx').on(
      table.targetLocationFolderId,
      table.createdAt,
    ),
    index('log_entries_level_idx').on(table.level),
    index('log_entries_target_object_key_idx').on(
      table.targetLocationObjectKey,
    ),
  ],
)

export type LogEntry = typeof logEntriesTable.$inferSelect
export type NewLogEntry = typeof logEntriesTable.$inferInsert
