import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { foldersTable } from '../../folder/entities/folder.entity'

export const folderOperationsTable = pgTable('folder_operations', {
  id: uuid('id').primaryKey(),
  operationData: jsonb('operationData')
    .$type<{ [key: string]: any }>()
    .notNull(),
  started: boolean('started').notNull().default(false),
  completed: boolean('completed').notNull().default(false),
  operationName: text('operationName').notNull(),
  error: text('error'),
  folderId: uuid('folderId')
    .notNull()
    .references(() => foldersTable.id),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type FolderOperation = typeof folderOperationsTable.$inferSelect
export type NewFolderOperation = typeof folderOperationsTable.$inferInsert
