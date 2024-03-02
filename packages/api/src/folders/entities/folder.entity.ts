import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { Location } from 'src/locations/entities/locations.entity'
import { locationsTable } from 'src/locations/entities/locations.entity'
import { usersTable } from 'src/users/entities/user.entity'

export const foldersTable = pgTable('folders', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  contentLocationId: uuid('contentLocationId')
    .notNull()
    .references(() => locationsTable.id),
  metadataLocationId: uuid('metadataLocationId')
    .notNull()
    .references(() => locationsTable.id),
  ownerId: uuid('ownerId')
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const foldersRelations = relations(foldersTable, ({ one }) => ({
  contentLocation: one(locationsTable, {
    fields: [foldersTable.contentLocationId],
    references: [locationsTable.id],
  }),
  metadataLocation: one(locationsTable, {
    fields: [foldersTable.metadataLocationId],
    references: [locationsTable.id],
  }),
  owner: one(usersTable, {
    fields: [foldersTable.ownerId],
    references: [usersTable.id],
  }),
}))

export type FolderWithoutLocations = typeof foldersTable.$inferSelect
export type Folder = typeof foldersTable.$inferSelect & {
  contentLocation: Location
  metadataLocation: Location
}
export type NewFolder = typeof foldersTable.$inferInsert
