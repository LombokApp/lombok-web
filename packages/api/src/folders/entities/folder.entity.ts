import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import type { StorageLocation } from 'src/storage/entities/storage-location.entity'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { usersTable } from 'src/users/entities/user.entity'

import { folderSharesTable } from './folder-share.entity'

export const foldersTable = pgTable(
  'folders',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    // NULL means "the builtin (embedded) provision" — the location is resolved
    // in memory from the embedded credentials rather than stored as a row.
    contentLocationId: uuid('content_location_id').references(
      () => storageLocationsTable.id,
    ),
    metadataLocationId: uuid('metadata_location_id').references(
      () => storageLocationsTable.id,
    ),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => usersTable.id),
    accessError: jsonb('access_error').$type<{
      message: string
      code: string
    }>(),
    iconUpdatedAt: timestamp('icon_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('folders_owner_id_idx').on(table.ownerId),
    index('folders_content_location_id_idx').on(table.contentLocationId),
    index('folders_metadata_location_id_idx').on(table.metadataLocationId),
  ],
)

export const foldersRelations = relations(foldersTable, ({ one, many }) => ({
  contentLocation: one(storageLocationsTable, {
    fields: [foldersTable.contentLocationId],
    references: [storageLocationsTable.id],
  }),
  metadataLocation: one(storageLocationsTable, {
    fields: [foldersTable.metadataLocationId],
    references: [storageLocationsTable.id],
  }),
  owner: one(usersTable, {
    fields: [foldersTable.ownerId],
    references: [usersTable.id],
  }),
  folderShares: many(folderSharesTable, {
    relationName: 'folderShares',
  }),
}))

export type FolderWithoutLocations = typeof foldersTable.$inferSelect

// A folder's resolved storage target: addressing-only. Discriminated on
// kind — BUILTIN is the embedded provision (no stored row, no id/userId);
// SERVER/USER are backed by a persisted storage_locations row. BUILTIN is a
// wire-only value (the DB enum stays SERVER/USER).
type BaseStorageTarget = Pick<
  StorageLocation,
  | 'label'
  | 'endpoint'
  | 'region'
  | 'bucket'
  | 'prefix'
  | 'accessKeyId'
  | 'accessKeyHashId'
  | 'secretAccessKey'
>

export type FolderStorageTarget =
  | (BaseStorageTarget & { kind: 'BUILTIN'; id: null; userId: null })
  | (BaseStorageTarget & {
      kind: 'SERVER' | 'USER'
      id: string
      userId: string
    })

export type Folder = typeof foldersTable.$inferSelect & {
  contentLocation: FolderStorageTarget
  metadataLocation: FolderStorageTarget
}
export type NewFolder = typeof foldersTable.$inferInsert
