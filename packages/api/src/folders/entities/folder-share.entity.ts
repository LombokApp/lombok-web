import { sql } from 'drizzle-orm'
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { foldersTable } from './folder.entity'

export const folderSharesTable = pgTable(
  'folder_shares',
  {
    folderId: uuid('folderId')
      .references(() => foldersTable.id)
      .notNull(),
    userId: uuid('userId').notNull(),
    permissions: text('permissions').array().notNull(),
    createdAt: text('createdAt')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text('updatedAt')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    // Index for user lookups
    userIdx: [table.userId],
    // Unique constraint for folder-user pairs
    folderUserUnique: [table.folderId, table.userId],
  }),
)

export type FolderShare = typeof folderSharesTable.$inferSelect
export type NewFolderShare = typeof folderSharesTable.$inferInsert
