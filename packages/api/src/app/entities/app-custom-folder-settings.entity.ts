import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'

import { appsTable } from './app.entity'

export const appCustomFolderSettingsTable = pgTable(
  'app_custom_folder_settings',
  {
    folderId: uuid('folder_id')
      .references(() => foldersTable.id, { onDelete: 'cascade' })
      .notNull(),
    appId: text('app_id')
      .references(() => appsTable.id, { onDelete: 'cascade' })
      .notNull(),
    key: text('key').notNull(),
    value: jsonb('value').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.folderId, table.appId, table.key],
    }),
    index('app_custom_folder_settings_folder_app_idx').on(
      table.folderId,
      table.appId,
    ),
  ],
)

export const appCustomFolderSettingsRelations = relations(
  appCustomFolderSettingsTable,
  ({ one }) => ({
    folder: one(foldersTable, {
      fields: [appCustomFolderSettingsTable.folderId],
      references: [foldersTable.id],
    }),
    app: one(appsTable, {
      fields: [appCustomFolderSettingsTable.appId],
      references: [appsTable.id],
    }),
  }),
)

export type AppCustomFolderSetting =
  typeof appCustomFolderSettingsTable.$inferSelect
export type NewAppCustomFolderSetting =
  typeof appCustomFolderSettingsTable.$inferInsert
