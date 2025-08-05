import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export const logEntriesTable = pgTable('log_entries', {
  id: uuid('id').primaryKey(),
  message: text('message').notNull(),
  emitterIdentifier: text('emitterIdentifier').notNull(),
  folderId: text('folderId'),
  level: text('level').notNull().$type<LogLevel>(),
  objectKey: text('objectKey'),
  data: jsonb('data').$type<unknown>(),
  createdAt: timestamp('createdAt').notNull(),
})

export type LogEntry = typeof logEntriesTable.$inferSelect
export type NewLogEntry = typeof logEntriesTable.$inferInsert
