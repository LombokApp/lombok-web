import type { ContentMetadataByHash, MediaType } from '@stellariscloud/types'
import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const folderObjectsTable = pgTable(
  'folder_objects',
  {
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
  },
  (table) => [
    index('folder_objects_folder_id_media_type_size_bytes_idx').on(
      table.folderId,
      table.sizeBytes,
      table.mediaType,
    ),
    index('folder_objects_folder_id_media_type_idx').on(
      table.folderId,
      table.mediaType,
    ),
    uniqueIndex('folder_objects_folder_id_object_key_unique').on(
      table.folderId,
      table.objectKey,
    ),
  ],
)

export type FolderObject = typeof folderObjectsTable.$inferSelect
export type NewFolderObject = typeof folderObjectsTable.$inferInsert
