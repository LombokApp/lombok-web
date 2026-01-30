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
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const appsTable = pgTable(
  'apps',
  {
    identifier: text('identifier').primaryKey(),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    publicKey: text('public_key').notNull(),
    requiresStorage: boolean('requires_storage').notNull(),
    subscribedCoreEvents: text('subscribed_core_events')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    implementedTasks: text('implemented_tasks')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    contentHash: text('content_hash').notNull(),
    config: jsonb('config').$type<AppConfig>().notNull(),
    userScopeEnabledDefault: boolean('user_scope_enabled_default').notNull(),
    folderScopeEnabledDefault: boolean(
      'folder_scope_enabled_default',
    ).notNull(),
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
    runtimeWorkers: jsonb('runtime_workers')
      .$type<AppRuntimeWorkersBundle>()
      .notNull(),
    ui: jsonb('ui').$type<AppUiBundle>().notNull(),
    database: boolean('database').notNull().default(false),
    manifest: jsonb('manifest').$type<AppManifest>().notNull(),
    containerProfiles: jsonb('container_profiles')
      .$type<Record<string, ContainerProfileConfig>>()
      .notNull()
      .default({}),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('apps_slug_unique').on(table.slug),
    index('apps_enabled_idx').on(table.enabled),
  ],
)

export type App = typeof appsTable.$inferSelect
export type NewApp = typeof appsTable.$inferInsert
