import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const logEntriesTable = pgTable('log_entries', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  appIdentifier: uuid('appIdentifier').notNull(),
  message: text('message').notNull(),
  data: jsonb('data').$type<any>(),
  level: text('level').notNull().default('info'),
  createdAt: timestamp('createdAt').notNull(),
})

export type LogEntry = typeof logEntriesTable.$inferSelect
export type NewLogEntry = typeof logEntriesTable.$inferInsert
