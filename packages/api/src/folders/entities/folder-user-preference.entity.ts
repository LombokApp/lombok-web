import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

import { foldersTable } from './folder.entity'

export const folderUserPreferencesTable = pgTable(
  'folder_user_preferences',
  {
    userId: uuid('user_id')
      .references(() => usersTable.id, { onDelete: 'cascade' })
      .notNull(),
    folderId: uuid('folder_id')
      .references(() => foldersTable.id, { onDelete: 'cascade' })
      .notNull(),
    starred: boolean('starred').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('folder_user_preferences_user_id_idx').on(table.userId),
    uniqueIndex('folder_user_preferences_user_folder_unique').on(
      table.userId,
      table.folderId,
    ),
  ],
)

export const folderUserPreferencesRelations = relations(
  folderUserPreferencesTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [folderUserPreferencesTable.userId],
      references: [usersTable.id],
    }),
    folder: one(foldersTable, {
      fields: [folderUserPreferencesTable.folderId],
      references: [foldersTable.id],
    }),
  }),
)

export type FolderUserPreference =
  typeof folderUserPreferencesTable.$inferSelect
export type NewFolderUserPreference =
  typeof folderUserPreferencesTable.$inferInsert
