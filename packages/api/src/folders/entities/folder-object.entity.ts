import type { ContentMetadataByHash, MediaType } from '@lombokapp/types'
import { type SQL, sql } from 'drizzle-orm'
import {
  bigint,
  customType,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { foldersTable } from './folder.entity'

// Custom type for PostgreSQL tsvector
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

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
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('english', coalesce(${folderObjectsTable.filename}, '')), 'A') || setweight(to_tsvector('english', coalesce(${folderObjectsTable.objectKey}, '')), 'B')`,
    ),
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
    // GIN index for full-text search on generated search_vector column
    index('folder_objects_search_vector_idx').using('gin', table.searchVector),
    // Trigram GIN index for filename similarity search
    index('folder_objects_object_key_trgm_idx').using(
      'gin',
      table.filename.op('gin_trgm_ops'),
    ),
    uniqueIndex('folder_objects_folder_id_object_key_unique').on(
      table.folderId,
      table.objectKey,
    ),
  ],
)

export type FolderObject = typeof folderObjectsTable.$inferSelect
export type NewFolderObject = typeof folderObjectsTable.$inferInsert
