import { relations } from 'drizzle-orm'
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'

import { appsTable } from './app.entity'

export const appCustomFolderSettingsTable = pgTable(
  'app_custom_folder_settings',
  {
    folderId: uuid('folder_id')
      .references(() => foldersTable.id)
      .notNull(),
    appIdentifier: text('app_identifier')
      .references(() => appsTable.identifier)
      .notNull(),
    values: jsonb('values')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('app_custom_folder_settings_folder_app_unique').on(
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

export type AppCustomFolderSettings =
  typeof appCustomFolderSettingsTable.$inferSelect
export type NewAppCustomFolderSettings =
  typeof appCustomFolderSettingsTable.$inferInsert
