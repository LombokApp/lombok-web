import type {
  AppConfig,
  AppManifest,
  AppUIMap,
  AppWorkersMap,
} from '@stellariscloud/types'
import { sql } from 'drizzle-orm'
import { boolean, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const appsTable = pgTable('apps', {
  identifier: text('identifier').primaryKey(),
  label: text('label').notNull(),
  publicKey: text('publicKey').notNull(),
  requiresStorage: boolean('requiresStorage').notNull(),
  subscribedEvents: text('subscribedEvents')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  implementedTasks: text('implementedTasks')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  contentHash: text('contentHash').notNull(),
  config: jsonb('config').$type<AppConfig>().notNull(),
  workers: jsonb('workers').$type<AppWorkersMap>().notNull(),
  ui: jsonb('ui').$type<AppUIMap>().notNull(),
  manifest: jsonb('manifest').$type<AppManifest>().notNull(),
  enabled: boolean('enabled').notNull().default(false),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type App = typeof appsTable.$inferSelect
export type NewApp = typeof appsTable.$inferInsert
