import type { LogEntryLevel } from '@lombokapp/types'
import { sql } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const logEntriesTable = pgTable(
  'log_entries',
  {
    id: uuid('id').primaryKey(),
    message: text('message').notNull(),
    emitterIdentifier: text('emitterIdentifier').notNull(),
    targetLocation: jsonb('targetLocation').$type<{
      folderId: string
      objectKey?: string
    }>(),
    level: text('level').notNull().$type<LogEntryLevel>(),
    data: jsonb('data').$type<unknown>(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => [
    index('log_entries_target_location_folder_id_idx').using(
      'btree',
      sql`((${table.targetLocation} ->> 'folderId')::uuid)`,
    ),
  ],
)

export type LogEntry = typeof logEntriesTable.$inferSelect
export type NewLogEntry = typeof logEntriesTable.$inferInsert
