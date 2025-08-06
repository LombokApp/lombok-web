import { relations } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { foldersTable } from '../../folders/entities/folder.entity'

export enum LogEntryLevel {
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
  subjectFolderId: uuid('subjectFolderId').references(() => foldersTable.id),
  level: text('level').notNull().$type<LogEntryLevel>(),
  subjectObjectKey: text('subjectObjectKey'),
  data: jsonb('data').$type<unknown>(),
  createdAt: timestamp('createdAt').notNull(),
})

export const logEntriesRelations = relations(logEntriesTable, ({ one }) => ({
  folder: one(foldersTable, {
    fields: [logEntriesTable.subjectFolderId],
    references: [foldersTable.id],
  }),
}))

export type LogEntry = typeof logEntriesTable.$inferSelect
export type NewLogEntry = typeof logEntriesTable.$inferInsert
