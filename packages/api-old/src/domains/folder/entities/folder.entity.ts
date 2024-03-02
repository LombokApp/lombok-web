import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import type { StorageLocation } from '../../storage-location/entities/storage-location.entity'
import { storageLocationsTable } from '../../storage-location/entities/storage-location.entity'
import { usersTable } from '../../user/entities/user.entity'

export const foldersTable = pgTable('folders', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  contentLocationId: uuid('contentLocationId')
    .notNull()
    .references(() => storageLocationsTable.id),
  metadataLocationId: uuid('metadataLocationId')
    .notNull()
    .references(() => storageLocationsTable.id),
  ownerId: uuid('ownerId')
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const foldersRelations = relations(foldersTable, ({ one }) => ({
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
}))

export type FolderWithoutLocations = typeof foldersTable.$inferSelect
export type Folder = typeof foldersTable.$inferSelect & {
  contentLocation: StorageLocation
  metadataLocation: StorageLocation
}
export type NewFolder = typeof foldersTable.$inferInsert
