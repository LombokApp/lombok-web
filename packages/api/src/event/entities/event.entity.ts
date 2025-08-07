import { relations } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'

export const eventsTable = pgTable('events', {
  id: uuid('id').primaryKey(),
  eventIdentifier: text('eventIdentifier').notNull(),
  emitterIdentifier: text('emitterIdentifier').notNull(),
  userId: text('userId'),
  subjectFolderId: uuid('subjectFolderId').references(() => foldersTable.id),
  subjectObjectKey: text('subjectObjectKey'),
  data: jsonb('data').$type<unknown>(),
  createdAt: timestamp('createdAt').notNull(),
})

export const eventsRelations = relations(eventsTable, ({ one }) => ({
  folder: one(foldersTable, {
    fields: [eventsTable.subjectFolderId],
    references: [foldersTable.id],
  }),
}))

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
