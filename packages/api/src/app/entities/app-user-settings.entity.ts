import type {
  FolderScopeAppPermissions,
  UserScopeAppPermissions,
} from '@lombokapp/types'
import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

import { appsTable } from './app.entity'

export const appUserSettingsTable = pgTable(
  'app_user_settings',
  {
    userId: uuid('user_id')
      .references(() => usersTable.id)
      .notNull(),
    appIdentifier: text('app_identifier')
      .references(() => appsTable.identifier)
      .notNull(),
    enabled: boolean('enabled'),
    folderScopeEnabledDefault: boolean('folder_scope_enabled_default'),
    folderScopePermissionsDefault: jsonb(
      'folder_scope_permissions_default',
    ).$type<FolderScopeAppPermissions[]>(),
    permissions: jsonb('permissions').$type<UserScopeAppPermissions[]>(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('app_user_settings_user_id_idx').on(table.userId),
    uniqueIndex('app_user_settings_user_app_unique').on(
      table.userId,
      table.appIdentifier,
    ),
  ],
)

export const appUserSettingsRelations = relations(
  appUserSettingsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [appUserSettingsTable.userId],
      references: [usersTable.id],
    }),
    app: one(appsTable, {
      fields: [appUserSettingsTable.appIdentifier],
      references: [appsTable.identifier],
    }),
  }),
)

export type AppUserSettings = typeof appUserSettingsTable.$inferSelect
export type NewAppUserSettings = typeof appUserSettingsTable.$inferInsert
