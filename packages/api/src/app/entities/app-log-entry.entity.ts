import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const appLogEntriesTable = pgTable('app_log_entries', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  appId: uuid('appId').notNull(),
  message: text('message').notNull(),
  data: jsonb('data').$type<any>(),
  level: text('level').notNull().default('info'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type AppLogEntry = typeof appLogEntriesTable.$inferSelect
export type NewAppLogEntry = typeof appLogEntriesTable.$inferInsert
