import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { usersTable } from '../../user/entities/user.entity'

export const folderWorkerKeysTable = pgTable('folder_worker_keys', {
  id: uuid('id').primaryKey(),
  hash: text('hash').notNull(),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt').notNull(),
  ownerId: uuid('ownerId').references(() => usersTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type FolderWorkerKey = typeof folderWorkerKeysTable.$inferSelect
export type NewFolderWorkerKey = typeof folderWorkerKeysTable.$inferInsert
