import type { FolderPermissionName } from '@lombokapp/types'
import { relations, sql } from 'drizzle-orm'
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

import { foldersTable } from './folder.entity'

export const folderSharesTable = pgTable(
  'folder_shares',
  {
    folderId: uuid('folder_id')
      .references(() => foldersTable.id)
      .notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    permissions: text('permissions')
      .array()
      .notNull()
      .$type<FolderPermissionName[]>(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('folder_shares_user_id_idx').on(table.userId),
    uniqueIndex('folder_shares_folder_user_unique').on(
      table.folderId,
      table.userId,
    ),
  ],
)

export const folderSharesRelations = relations(
  folderSharesTable,
  ({ one }) => ({
    folder: one(foldersTable, {
      fields: [folderSharesTable.folderId],
      references: [foldersTable.id],
      relationName: 'folderShares',
    }),
  }),
)

export type FolderShare = typeof folderSharesTable.$inferSelect
export type NewFolderShare = typeof folderSharesTable.$inferInsert
