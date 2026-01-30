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
    contentLocationId: uuid('content_location_id')
      .notNull()
      .references(() => storageLocationsTable.id),
    metadataLocationId: uuid('metadata_location_id')
      .notNull()
      .references(() => storageLocationsTable.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => usersTable.id),
    accessError: jsonb('access_error').$type<{
      message: string
      code: string
    }>(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
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
export type Folder = typeof foldersTable.$inferSelect & {
  contentLocation: StorageLocation
  metadataLocation: StorageLocation
}
export type NewFolder = typeof foldersTable.$inferInsert
