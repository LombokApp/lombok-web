import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const serverConfigurationsTable = pgTable('server_configurations', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<any>(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type ServerConfiguration = typeof serverConfigurationsTable.$inferSelect
export type NewServerConfiguration =
  typeof serverConfigurationsTable.$inferInsert
