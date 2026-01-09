import type {
  AppConfig,
  AppManifest,
  AppRuntimeWorkersBundle,
  AppUiBundle,
  ContainerProfileConfig,
  CoreScopeAppPermissions,
  FolderScopeAppPermissions,
  UserScopeAppPermissions,
} from '@lombokapp/types'
import { sql } from 'drizzle-orm'
import { boolean, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const appsTable = pgTable('apps', {
  identifier: text('identifier').primaryKey(),
  slug: text('slug').notNull(),
  label: text('label').notNull(),
  publicKey: text('publicKey').notNull(),
  requiresStorage: boolean('requiresStorage').notNull(),
  subscribedCoreEvents: text('subscribedCoreEvents')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  implementedTasks: text('implementedTasks')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  contentHash: text('contentHash').notNull(),
  config: jsonb('config').$type<AppConfig>().notNull(),
  userScopeEnabledDefault: boolean('userScopeEnabledDefault').notNull(),
  folderScopeEnabledDefault: boolean('folderScopeEnabledDefault').notNull(),
  permissions: jsonb('permissions')
    .$type<{
      core: CoreScopeAppPermissions[]
      user: UserScopeAppPermissions[]
      folder: FolderScopeAppPermissions[]
    }>()
    .notNull()
    .default({
      core: [],
      user: [],
      folder: [],
    }),
  runtimeWorkers: jsonb('runtimeWorkers')
    .$type<AppRuntimeWorkersBundle>()
    .notNull(),
  ui: jsonb('ui').$type<AppUiBundle>().notNull(),
  database: boolean('database').notNull().default(false),
  manifest: jsonb('manifest').$type<AppManifest>().notNull(),
  containerProfiles: jsonb('containerProfiles')
    .$type<Record<string, ContainerProfileConfig>>()
    .notNull()
    .default({}),
  enabled: boolean('enabled').notNull().default(false),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type App = typeof appsTable.$inferSelect
export type NewApp = typeof appsTable.$inferInsert
