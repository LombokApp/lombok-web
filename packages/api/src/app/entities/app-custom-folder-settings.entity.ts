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
    appIdentifier: text('app_identifier')
      .references(() => appsTable.identifier, { onDelete: 'cascade' })
      .notNull(),
    key: text('key').notNull(),
    value: jsonb('value').$type<unknown>().notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.folderId, table.appIdentifier, table.key],
    }),
    index('app_custom_folder_settings_folder_app_idx').on(
      table.folderId,
      table.appIdentifier,
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
      fields: [appCustomFolderSettingsTable.appIdentifier],
      references: [appsTable.identifier],
    }),
  }),
)

export type AppCustomFolderSetting =
  typeof appCustomFolderSettingsTable.$inferSelect
export type NewAppCustomFolderSetting =
  typeof appCustomFolderSettingsTable.$inferInsert
