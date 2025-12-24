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

import { foldersTable } from './folder.entity'

export const folderSharesTable = pgTable(
  'folder_shares',
  {
    folderId: uuid('folderId')
      .references(() => foldersTable.id)
      .notNull(),
    userId: uuid('userId').notNull(),
    permissions: text('permissions')
      .array()
      .notNull()
      .$type<FolderPermissionName[]>(),
    createdAt: timestamp('createdAt')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updatedAt')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('user_idx').on(table.userId),
    uniqueIndex('folder_user_unique').on(table.folderId, table.userId),
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
