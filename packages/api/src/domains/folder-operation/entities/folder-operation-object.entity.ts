import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { foldersTable } from '../../folder/entities/folder.entity'
import { folderObjectsTable } from '../../folder/entities/folder-object.entity'
import { folderOperationsTable } from './folder-operation.entity'

export type OperationRelationType = 'INPUT' | 'OUTPUT'
export const operationRelationTypeEnum = pgEnum('operationRelationType', [
  'INPUT',
  'OUTPUT',
])

export const folderOperationObjectsTable = pgTable('folder_operation_objects', {
  id: uuid('id').primaryKey(),
  operationId: uuid('operationId')
    .notNull()
    .references(() => folderOperationsTable.id),
  operationRelationType: text('operationRelationType').notNull(),
  folderObjectId: uuid('folderObjectId')
    .notNull()
    .references(() => folderObjectsTable.id),
  folderId: uuid('folderId')
    .notNull()
    .references(() => foldersTable.id),
  objectKey: text('objectKey').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type FolderOperationObject =
  typeof folderOperationObjectsTable.$inferSelect
export type NewFolderOperationObject =
  typeof folderOperationObjectsTable.$inferInsert
