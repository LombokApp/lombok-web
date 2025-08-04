import type {
  AppConfig,
  AppManifest,
  AppUIMap,
  AppWorkerScriptMap,
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
  workerScripts: jsonb('workerScripts').$type<AppWorkerScriptMap>().notNull(),
  uis: jsonb('uis').$type<AppUIMap>().notNull(),
  manifest: jsonb('manifest').$type<AppManifest>().notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type App = typeof appsTable.$inferSelect
export type NewApp = typeof appsTable.$inferInsert
