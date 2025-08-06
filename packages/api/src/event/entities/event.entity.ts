import { relations } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'

export const eventsTable = pgTable('events', {
  id: uuid('id').primaryKey(),
  eventKey: text('eventKey').notNull(),
  emitterIdentifier: text('emitterIdentifier').notNull(),
  userId: text('userId'),
  folderId: uuid('folderId').references(() => foldersTable.id),
  objectKey: text('objectKey'),
  data: jsonb('data').$type<unknown>(),
  createdAt: timestamp('createdAt').notNull(),
})

/**
 * Relations for efficient joins between events, folders, and folder objects.
 *
 * This setup allows for:
 * 1. Joining events to folders using just folderId
 * 2. Joining events to folder objects using the composite key (folderId, objectKey)
 *
 * Example usage:
 *
 * // Get events with folder information
 * const eventsWithFolders = await db.query.eventsTable.findMany({
 *   with: {
 *     folder: true
 *   }
 * })
 *
 * // Get events with folder object information
 * const eventsWithObjects = await db.query.eventsTable.findMany({
 *   with: {
 *     folderObject: true
 *   }
 * })
 *
 * // Get events with both folder and folder object information
 * const eventsWithAll = await db.query.eventsTable.findMany({
 *   with: {
 *     folder: true,
 *     folderObject: true
 *   }
 * })
 */
export const eventsRelations = relations(eventsTable, ({ one }) => ({
  folder: one(foldersTable, {
    fields: [eventsTable.folderId],
    references: [foldersTable.id],
  }),
  folderObject: one(folderObjectsTable, {
    fields: [eventsTable.folderId, eventsTable.objectKey],
    references: [folderObjectsTable.folderId, folderObjectsTable.objectKey],
  }),
}))

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
