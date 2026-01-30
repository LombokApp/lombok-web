import type { ContentMetadataByHash, MediaType } from '@lombokapp/types'
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

import { foldersTable } from './folder.entity'

export const folderObjectsTable = pgTable(
  'folder_objects',
  {
    id: uuid('id').primaryKey(),
    objectKey: text('object_key').notNull(),
    filename: text('filename').notNull(),
    eTag: text('e_tag').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    lastModified: bigint('last_modified', { mode: 'number' }).notNull(),
    hash: text('hash'),
    contentMetadata: jsonb('content_metadata')
      .$type<ContentMetadataByHash>()
      .notNull(),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => foldersTable.id, { onDelete: 'cascade' }),
    mimeType: text('mime_type').notNull(),
    mediaType: text('media_type').notNull().$type<MediaType>(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
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
