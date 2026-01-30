import type { FolderScopeAppPermissions } from '@lombokapp/types'
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
import { foldersTable } from 'src/folders/entities/folder.entity'

import { appsTable } from './app.entity'

export const appFolderSettingsTable = pgTable(
  'app_folder_settings',
  {
    folderId: uuid('folder_id')
      .references(() => foldersTable.id)
      .notNull(),
    appIdentifier: text('app_identifier')
      .references(() => appsTable.identifier)
      .notNull(),
    enabled: boolean('enabled'),
    permissions: jsonb('permissions').$type<FolderScopeAppPermissions[]>(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('app_folder_settings_folder_id_idx').on(table.folderId),
    uniqueIndex('app_folder_settings_folder_app_unique').on(
      table.folderId,
      table.appIdentifier,
    ),
  ],
)

export const appFolderSettingsRelations = relations(
  appFolderSettingsTable,
  ({ one }) => ({
    folder: one(foldersTable, {
      fields: [appFolderSettingsTable.folderId],
      references: [foldersTable.id],
    }),
    app: one(appsTable, {
      fields: [appFolderSettingsTable.appIdentifier],
      references: [appsTable.identifier],
    }),
  }),
)

export type AppFolderSettings = typeof appFolderSettingsTable.$inferSelect
export type NewAppFolderSettings = typeof appFolderSettingsTable.$inferInsert
