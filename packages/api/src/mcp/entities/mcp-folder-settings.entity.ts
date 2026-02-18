import { relations } from 'drizzle-orm'
import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { usersTable } from 'src/users/entities/user.entity'

export const mcpFolderSettingsTable = pgTable(
  'mcp_folder_settings',
  {
    folderId: uuid('folder_id')
      .references(() => foldersTable.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => usersTable.id)
      .notNull(),
    canRead: boolean('can_read'),
    canWrite: boolean('can_write'),
    canDelete: boolean('can_delete'),
    canMove: boolean('can_move'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('mcp_folder_settings_folder_user_unique').on(
      table.folderId,
      table.userId,
    ),
  ],
)

export const mcpFolderSettingsRelations = relations(
  mcpFolderSettingsTable,
  ({ one }) => ({
    folder: one(foldersTable, {
      fields: [mcpFolderSettingsTable.folderId],
      references: [foldersTable.id],
    }),
    user: one(usersTable, {
      fields: [mcpFolderSettingsTable.userId],
      references: [usersTable.id],
    }),
  }),
)

export type McpFolderSettings = typeof mcpFolderSettingsTable.$inferSelect
export type NewMcpFolderSettings = typeof mcpFolderSettingsTable.$inferInsert
