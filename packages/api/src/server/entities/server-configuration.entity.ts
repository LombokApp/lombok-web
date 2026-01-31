import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { jsonbBase64 } from 'src/orm/util/json-base64-type'

export const serverSettingsTable = pgTable('server_settings', {
  key: text('key').primaryKey(),
  value: jsonbBase64('value').$type<unknown>(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export type ServerSetting = typeof serverSettingsTable.$inferSelect
export type NewServerSetting = typeof serverSettingsTable.$inferInsert
