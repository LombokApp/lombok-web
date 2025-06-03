import type { ContentMetadataByHash, MediaType } from '@stellariscloud/types'
import {
  bigint,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const folderObjectsTable = pgTable('folder_objects', {
  id: uuid('id').primaryKey(),
  objectKey: text('objectKey').notNull(),
  eTag: text('eTag').notNull(),
  sizeBytes: bigint('sizeBytes', { mode: 'number' }).notNull(),
  lastModified: bigint('lastModified', { mode: 'number' }).notNull(),
  hash: text('hash'),
  contentMetadata: jsonb('contentMetadata')
    .$type<ContentMetadataByHash>()
    .notNull(),
  folderId: uuid('folderId').notNull(),
  mimeType: text('mimeType').notNull(),
  mediaType: text('mediaType').notNull().$type<MediaType>(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type FolderObject = typeof folderObjectsTable.$inferSelect
export type NewFolderObject = typeof folderObjectsTable.$inferInsert
