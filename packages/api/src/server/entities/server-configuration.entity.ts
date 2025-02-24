import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const serverSettingsTable = pgTable('server_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type ServerSetting = typeof serverSettingsTable.$inferSelect
export type NewServerSetting = typeof serverSettingsTable.$inferInsert
